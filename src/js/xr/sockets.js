import path from 'path'
import {deselectObject, mergeState, getIsSceneDirty, getSelections, _unblockObject, _blockObject} from './../shared/reducers/shot-generator'
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
} from './../shared/reducers/remoteDevice'
import P2P from './../shared/network/p2p'

import {loadFileToBlob} from './../shared/network/peerUtils'


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

const getRemoteAction = (action, meta = {}) => {
  return {
    ...action,
    meta: {
      ...meta,
      isSG: true
    }
  }
}

const dispatchRemote = (action, meta = {}) => {
  if (!IO.current) {
    return false
  }
  
  IO.current.broadcast('action', getRemoteAction(action, meta))
}

const onUserConnect = (emit, broadcast, id, store) => {
  const connectAction = addUser(id)
  remoteStore.dispatch(connectAction)
  broadcast('remoteAction', connectAction)
}

export const serve = (store, service, staticPath, projectPath, userDataPath) => {
  return new Promise((resolve, reject) => {
    const peer = P2P()
    const {io, broadcast} = peer
    
    IO.current = peer

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
    
    io.on('connection', ({emitter, emit, id}) => {

      console.log('%c XR', 'color: #4CAF50', `User has been connected: ${id}`)
      onUserConnect(emit, broadcast, id, store)
      
      emitter.on('action', (action) => {
        store.dispatch(action)
      })

      emitter.on('debug', (data) => {
        console.log('%c Log', 'color: #0088ff', data)
      })

      emitter.on('connectRequest', () => {
        console.log('Send STATE')
        //dispatchRemote(mergeState(store.getState()))
        emit('action', getRemoteAction(mergeState(store.getState())))
        emit('remoteAction', setId(id))
        emit('remoteAction', setUsers(getRemoteDevices(remoteStore.getState())))
      })

      emitter.on('remote', (info) => {
        const infoAction = updateUser(id, info)
        
        remoteStore.dispatch(infoAction)
        broadcast('remoteAction', infoAction)
      })
      
      emitter.on('close', (reason) => {
        console.log('%c XR', 'color: #4CAF50', `User has been disconnected: ${id}, because of the: ${reason}`)
        
        const disconnectAction = removeUser(id)
        
        remoteStore.dispatch(disconnectAction)
        broadcast('remoteAction', disconnectAction)
      })

      emitter.on('getBoards', async () => {
        emit('getBoards', await service.getBoards())
      })

      emitter.on('setBoard', async (uid) => {
        let boards = await service.getBoards()
        if (boards.find(board => board.uid === uid)) {
          console.log('New board ID: ', uid)
          await service.loadBoardByUid(uid)
        }
        
        emit('setBoard')
      })

      emitter.on('saveShot', async () => {
        await service.saveShot()
        emit('saveShot')
      })

      emitter.on('insertShot', async () => {
        emit('insertShot', await service.insertShot())
      })

      emitter.on('getSg', async () => {
        let board = await service.getBoard(store.getState().board.uid)
        emit('getSg', board)
      })

      emitter.on('isSceneDirty', () => {
        emit('isSceneDirty', getIsSceneDirty(store.getState()))
      })

      emitter.on('getResource', async ({type, filePath}) => {
        console.log(type, filePath)
        const key = pathMapKeys.find((item) => filePath.indexOf(item) !== -1)
        
        console.log('Getting resource: ', filePath)
        const image = await loadFileToBlob(path.join(pathMap[key](staticPath, projectPath, userDataPath), path.relative(key, filePath)))
        console.log('Sending resource: ', image)

        emit('willLoad', {path: filePath})
        emit('getResource', {type, filePath, data: image})
      })
      
    })
  })
}

export const SGMiddleware = store => next => action => {
  if (!IO.current || (RestrictedActions.indexOf(action.type) !== -1)) {
    if (SelectActions.indexOf(action.type) !== -1) {
      let selectionsBefore = getSelections(store.getState())

      const result = next(action)
      let selectionsAfter = getSelections(store.getState())

      console.log('Before/After', selectionsBefore, selectionsAfter)
      const selectionsToBlock = selectionsAfter.filter(item => selectionsBefore.indexOf(item) === -1)
      const selectionsToUnblock = selectionsBefore.filter(item => selectionsAfter.indexOf(item) === -1)
      console.log('Block/Unblock', selectionsToBlock, selectionsToUnblock)

      if (selectionsToUnblock.length) dispatchRemote(_unblockObject(selectionsToUnblock), {ignoreSG: true}) // Unblock deselected
      if (selectionsToBlock.length) dispatchRemote(_blockObject(selectionsToBlock), {ignoreSG: true}) // Block selected

      return result
    }
    
    return next(action)
  }
  
  if (action.meta && action.meta.ignoreSG) {
    return false
  }
  
  dispatchRemote(action, action.meta)
  return next(action)
}

