import path from 'path'
import {mergeState, getIsSceneDirty, getSelections, _unblockObject, _blockObject, _unblockAll} from '../../shared/reducers/shot-generator'
import {
  remoteStore,
  RestrictedActions,
  addUser,
  updateUser,
  removeUser,
  setId,
  setUsers,
  getRemoteDevices,
  SelectActions
} from '../../shared/reducers/remoteDevice'
import P2P from '../../shared/network/p2p'

import {loadFileToBlob} from '../../shared/network/peerUtils'

// Map all the reosource paths to actual paths
const pathMap = {
  '/data/system': (staticPath, projectPath, userDataPath) => path.join(staticPath, 'data', 'shot-generator'),
  '/data/user': (staticPath, projectPath, userDataPath) => path.join(projectPath, 'models'),
  '/data/snd': (staticPath, projectPath, userDataPath) => path.join(staticPath, 'public', 'snd'),
  '/data/presets/poses': (staticPath, projectPath, userDataPath) => path.join(userDataPath, 'presets', 'poses'),
  '/data/presets/handPoses': (staticPath, projectPath, userDataPath) => path.join(userDataPath, 'presets', 'handPoses'),
  '/boards/images': (staticPath, projectPath, userDataPath) => path.join(projectPath, 'images')
}

const pathMapKeys = Object.keys(pathMap)



const IO = {current: null}

// Map ation to the server standard
const getRemoteAction = (action, meta = {}) => {
  return {
    ...action,
    meta: {
      ...meta,
      isSG: true
    }
  }
}

// Send an action to the all clients
const dispatchRemote = (action, meta = {}) => {
  if (!IO.current) {
    return false
  }
  
  IO.current.broadcast('action', getRemoteAction(action, meta))
}

// Add a new user to the remote store and notify all the users about the new one
const onUserConnect = (emit, broadcast, id, store) => {
  const connectAction = addUser(id)
  remoteStore.dispatch(connectAction)
  broadcast('remoteAction', connectAction)
}

// Connect to the lobby server and watch all the eventss
export const serve = (store, service, staticPath, projectPath, userDataPath) => {
  return new Promise((resolve, reject) => {
    const peer = P2P() // Connect
    const {io, broadcast} = peer
    
    IO.current = peer

    // Resolve on connect
    io.on('open', (id) => {
      console.log('currentID: ', id, peer)
      resolve({host: peer.peer.options.host, port: peer.peer.options.port, id})
    })

    io.on('error', (err) => {
      console.error(err)
    })

    io.on('disconnected', () => {
      console.log('Discconected from the lobby server')
    })
    
    // On user connect
    io.on('connection', ({emitter, emit, id}) => {

      console.log('%c XR', 'color: #4CAF50', `User has been connected: ${id}`)
      onUserConnect(emit, broadcast, id, store) // Add user into the system
      
      emitter.on('action', (action) => {
        store.dispatch(action) // Dispatch remote user actions
      })

      emitter.on('debug', (data) => {
        console.log('%c Log', 'color: #0088ff', data) // Log remote data
      })

      // After user successfully connected, it sends connectRequest to get the actual scene information
      emitter.on('connectRequest', () => {
        console.log('Send STATE')
        emit('action', getRemoteAction(mergeState(store.getState()))) // Send current state
        emit('remoteAction', setId(id)) // Send current ID
        emit('remoteAction', setUsers(getRemoteDevices(remoteStore.getState()))) // Send all the connected users
      })

      // User positions and other information that sends frequently applies to the remote store
      emitter.on('remote', (info) => {
        const infoAction = updateUser(id, info) // Construct an action
        
        remoteStore.dispatch(infoAction) // Apply action to the remote store
        broadcast('remoteAction', infoAction) // Send to the all connected users
      })
      
      // On disconnect
      emitter.on('close', (reason) => {
        console.log('%c XR', 'color: #4CAF50', `User has been disconnected: ${id}, because of the: ${reason}`)
        
        const disconnectAction = removeUser(id) // Construct an action
        
        remoteStore.dispatch(disconnectAction) // Apply to the remote store
        broadcast('remoteAction', disconnectAction) // Send to all the clients

        store.dispatch(_unblockAll()) // Unblock all the objects
        broadcast('askForBlock') // Ask user to send blocking objects
      })

      // Get all the boards
      emitter.on('getBoards', async () => {
        emit('getBoards', await service.getBoards())
      })

      // Set current board
      emitter.on('setBoard', async (uid) => {
        let boards = await service.getBoards()
        if (boards.find(board => board.uid === uid)) {
          console.log('New board ID: ', uid)
          await service.loadBoardByUid(uid)
        }
        
        emit('setBoard')
      })

      // Save shot
      emitter.on('saveShot', async () => {
        await service.saveShot()
        emit('saveShot')
      })

      // Insert as new shot
      emitter.on('insertShot', async () => {
        emit('insertShot', await service.insertShot())
      })

      // Get current board uid
      emitter.on('getSg', async () => {
        let board = await service.getBoard(store.getState().board.uid)
        emit('getSg', board)
      })

      // Check if scene is dirty
      emitter.on('isSceneDirty', () => {
        emit('isSceneDirty', getIsSceneDirty(store.getState()))
      })

      // Send a resource
      emitter.on('getResource', async ({type, filePath}) => {
        console.log(type, filePath)
        const key = pathMapKeys.find((item) => filePath.indexOf(item) !== -1)
        
        // Load resource as blob
        console.log('Getting resource: ', filePath)
        const image = await loadFileToBlob(path.join(pathMap[key](staticPath, projectPath, userDataPath), path.relative(key, filePath)))
        console.log('Sending resource: ', image)

        // Tell user that some resource will be loaded next
        emit('willLoad', {path: filePath})

        // Send resource(might be sent as a lot of chunks)
        emit('getResource', {type, filePath, data: image})
      })
      
    })
  })
}

// Redux middleware
export const SGMiddleware = store => next => action => {
  /**
   * Do not send restricted actions such as Object/Attachment selecting, etc.
   * Because of the following reason:
   * If user select an object and we send it next, then each user will select this object.
   * Each user must have an ability to select whatever object he want.
   */
  if (!IO.current || (RestrictedActions.indexOf(action.type) !== -1)) {
    // If we select something
    if (SelectActions.indexOf(action.type) !== -1) {
      let selectionsBefore = getSelections(store.getState()) // Get selections before store update

      const result = next(action) // Update store
      let selectionsAfter = getSelections(store.getState()) // Get selections after store update

      /**
       * Next, we should compare to arrays to understand what objects are free to select and what objects are restricted to select
       */
      console.log('Before/After', selectionsBefore, selectionsAfter)
      const selectionsToBlock = selectionsAfter.filter(item => selectionsBefore.indexOf(item) === -1) // Get objects block
      const selectionsToUnblock = selectionsBefore.filter(item => selectionsAfter.indexOf(item) === -1) // Get objects to unblock
      console.log('Block/Unblock', selectionsToBlock, selectionsToUnblock)

      if (selectionsToUnblock.length) dispatchRemote(_unblockObject(selectionsToUnblock), {ignoreSG: true}) // Unblock deselected
      if (selectionsToBlock.length) dispatchRemote(_blockObject(selectionsToBlock), {ignoreSG: true}) // Block selected

      // Return new state
      return result
    }
    
    // Return new state
    return next(action)
  }
  
  // If this action is ignored then return false
  if (action.meta && action.meta.ignoreSG) {
    return false
  }
  
  // In other case, send the current action to all the clients and return new state
  dispatchRemote(action, action.meta)
  return next(action)
}

