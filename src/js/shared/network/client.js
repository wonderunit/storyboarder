import {RestrictedActions, remoteStore} from "../reducers/remoteDevice"
import {_blockObject as blockObjectAction, _unblockObject as unblockObjectAction, getSelections} from "../reducers/shot-generator"
import P2P from './p2p'
import EventEmmiter from 'events'

// Helper function to call some fn once per N calls
const each = (fn, countRef) => {
  let times = 0
  return (args, immediate = false) => {
    times++
    
    if (times >= countRef.current || immediate) {
      fn(...args)
      times = 0
    }
  }
}

export const ResourceInfo = new EventEmmiter()
const resourcesMap = {}
const ResourcesMapStatuses = {PENDING: 'PENDING', LOADING: 'LOADING', SUCCESS: 'SUCCESS'}

// Connect both to the lobby server and to the target client
export const connect = (URI = '') => {
  return new Promise((resolve, reject) => {
    let roomId = window.location.pathname

    // If id isn't a part of the path then reject
    if (!roomId) {
      reject('Room is not entered')
      return false
    }
    
    if (roomId[0] === '/') {
      roomId = roomId.slice(1)
    }

    if (roomId[roomId.length - 1] === '/') {
      roomId = roomId.slice(0, -1)
    }

    // If id isn't valid then reject
    if (!roomId) {
      reject('Room is not entered')
      return false
    }

    // Connect to the lobby server
    const p2p = P2P(location.hostname)
    const {io, peer, P2PClientConnection} = p2p

    let store = {current: null}
    let FRAME_RATE = {current: 10}
    
    // Connect to the client
    P2PClientConnection(roomId).then((conn) => {
      const client = conn.emitter
      const emit = conn.emit

      console.log('Connected !!!', store)

      // Send an action to the SG
      const dispatchRemote = (action, meta = {}) => {
        if (!client) {
          return false
        }
  
        const XRAction = {
          ...action,
          meta: {
            ...meta,
            isXR: true
          }
        }
        emit('action', XRAction)
      }
      
      // Connect server to the application store
      const connectStore = (appStore) => {
        // Resolve users actions, such as controllers position, etc. 
        client.on('remoteAction', (data) => {
          console.log('remoteAction', data)
          remoteStore.dispatch(data)
        })
  
        // Resolve app actions
        client.on('action', (data) => {
          console.log('Action', data)
          appStore.dispatch(data)
        })

        // Send objects to block
        client.on('askForBlock', () => {
          let meta = {ignore: [remoteStore.getState().id]}
          dispatchRemote(blockObjectAction(getSelections(appStore.getState())), meta)
        })
      }

      const blockObject = (ids) => {
        let meta = {ignore: [remoteStore.getState().id]}
        dispatchRemote(blockObjectAction(ids), meta)
      }
      
      const unblockObject = (ids) => {
        let meta = {ignore: [remoteStore.getState().id]}
        dispatchRemote(unblockObjectAction(ids), meta)
      }
  
      // Get all the boards
      const getBoards = async () => {
        return new Promise((resolve, reject) => {
          client.once('getBoards', resolve)
          emit('getBoards')
        })
      }
  
      // Save current shot
      const saveShot = async () => {
        return new Promise((resolve, reject) => {
          client.once('saveShot', resolve)
          emit('saveShot')
        })
      }
  
      // Insert shot as new one
      const insertShot = () => {
        return new Promise((resolve, reject) => {
          client.once('insertShot', resolve)
          emit('insertShot')
        })
      }
  
      // Get board uid
      const getSg = () => {
        return new Promise((resolve, reject) => {
          client.once('getSg', resolve)
          emit('getSg')
        })
      }
  
      // Set current board
      const setBoard = (board) => {
        return new Promise((resolve, reject) => {
          client.once('setBoard', resolve)
          emit('setBoard', board)
        })
      }
  
      // Check if scene is dirty
      const isSceneDirty = () => {
        return new Promise((resolve, reject) => {
          client.once('isSceneDirty', resolve)
          emit('isSceneDirty')
        })
      }

      // Connect request to get the actual data(store, users, id, etc.)
      const connectRequest = () => {
        console.log('Send connect request')
        emit('connectRequest')
      }

      // Before SG send a resource we should know what resource we are waiting for
      client.on('willLoad', ({path}) => {
        resourcesMap[path] = {status: ResourcesMapStatuses.LOADING}
        ResourceInfo.emit('willLoad', path)
      })

      // Request resource from the SG
      const getResource = (type, filePath) => {
        return new Promise((resolve, reject) => {
          console.log('Getting - ', filePath)

          // If resource allready in the cache, then return it
          if (resourcesMap[filePath] && resourcesMap[filePath].status === ResourcesMapStatuses.SUCCESS) {
            resolve(resourcesMap[filePath].data)
          }

          // Temp function that used to resolve current asset
          const Fn = (res) => {
            if (res.filePath === filePath) {
              console.log('Resolved(*), ', filePath, res)
              resourcesMap[filePath] = {status: ResourcesMapStatuses.SUCCESS, data: res}
              client.off('getResource', Fn)
              resolve(res)
            }
          }

          // Listen for current resource
          client.on('getResource', Fn)

          // request resource
          emit('getResource', {type, filePath})

          // Mark resource as pending
          resourcesMap[filePath] = {status: ResourcesMapStatuses.PENDING}

          // If the resource wasn't accepted for loading by the server then reask
          const interval = setInterval(() => {
            if (resourcesMap[filePath] && resourcesMap[filePath].status === ResourcesMapStatuses.PENDING) {
              emit('getResource', {type, filePath})
            } else {
              // if a resource was accepted then remove interval
              clearInterval(interval)
            }
          }, 10 * 1000)
        })
      }
  
      // Redu middleware
      const ClientMiddleware = store => next => action => {
        // Not send restricted actions
        if (RestrictedActions.indexOf(action.type) !== -1) {
  
          /*
          // If we select something
          if (SelectActions.indexOf(action.type) !== -1) {
            let meta = {ignore: [remoteStore.getState().id]}

            let selectionsBefore = getSelections(store.getState())

            const result = next(action)
            let selectionsAfter = getSelections(store.getState())
            
            const selectionsToBlock = selectionsAfter.filter(item => selectionsBefore.indexOf(item) === -1)
            const selectionsToUnblock = selectionsBefore.filter(item => selectionsAfter.indexOf(item) === -1)

            if (selectionsToUnblock.length) dispatchRemote(unblockObject(selectionsToUnblock), meta) // Unblock deselected
            if (selectionsToBlock.length) dispatchRemote(blockObject(selectionsToBlock), meta) // Block selected

            return result
          }
          */
  
          /* Dispatch */
          return next(action)
        }
        
        /* Dispatch if the message came from SG */
        if (action.meta && action.meta.isSG) {
          /* Are we listed on the ignore list? */
          let id = remoteStore.getState().id
          let isIgnored = action.meta.ignore && (action.meta.ignore.indexOf(id) !== -1) && (id !== null)
          
          if (!isIgnored) {
            console.log('ACTION', action)
            return next(action)
          }
        } else {
          /* Send to the SG */
          dispatchRemote(action)
        }
        // Not send actions to the reducer, instead wait for the server answer
      }
  
      // Log to the SG
      const sendRemoteInfo = each((info) => {
        emit('remote', info)
      }, FRAME_RATE)
  
      // Set current user as active to enable 3d model
      const setActive = (active = true) => {
        emit('remote', {active})
      }
  
      resolve({
        connectStore,
        
        sendInfo: (info, immediate) => sendRemoteInfo([info], immediate),
        setActive,
        log: (info) => emit('debug', info),
        
        ClientMiddleware,
        
        setFrameRate: (value) => {
          FRAME_RATE.current = value
        },
  
        uriForThumbnail: filename => `${URI}/boards/images/${filename}`,
        
        getBoards,
        saveShot,
        insertShot,
        getSg,
        setBoard,
        isSceneDirty,

        getResource,
        connectRequest,


        blockObject,
        unblockObject
      })
    })
  })
}
