import {RestrictedActions, remoteStore, setId, SelectActions} from "../reducers/remoteDevice"
import {_blockObject, _unblockObject, getSelections} from "../reducers/shot-generator"
import P2P from './p2p'
import EventEmmiter from 'events'

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

export const connect = (URI = '') => {
  return new Promise((resolve, reject) => {
    let roomId = window.location.pathname
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

    if (!roomId) {
      reject('Room is not entered')
      return false
    }

    const p2p = P2P(location.hostname)
    const {io, peer, P2PClientConnection} = p2p

    let store = {current: null}
    let FRAME_RATE = {current: 10}
    
    P2PClientConnection(roomId).then((conn) => {
      const client = conn.emitter
      const emit = conn.emit

      console.log('Connected !!!', store)

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
      
      const connectStore = (appStore) => {
        client.on('remoteAction', (data) => {
          console.log('remoteAction', data)
          remoteStore.dispatch(data)
        })
  
        client.on('action', (data) => {
          console.log('Action', data)
          appStore.dispatch(data)
        })

        client.on('askForBlock', () => {
          let meta = {ignore: [remoteStore.getState().id]}
          dispatchRemote(_blockObject(getSelections(appStore.getState())), meta)
        })
      }
  
      const getBoards = async () => {
        return new Promise((resolve, reject) => {
          client.once('getBoards', resolve)
          emit('getBoards')
        })
      }
  
      const saveShot = async () => {
        return new Promise((resolve, reject) => {
          client.once('saveShot', resolve)
          emit('saveShot')
        })
      }
  
      const insertShot = () => {
        return new Promise((resolve, reject) => {
          client.once('insertShot', resolve)
          emit('insertShot')
        })
      }
  
      const getSg = () => {
        return new Promise((resolve, reject) => {
          client.once('getSg', resolve)
          emit('getSg')
        })
      }
  
      const setBoard = (board) => {
        return new Promise((resolve, reject) => {
          client.once('setBoard', resolve)
          emit('setBoard', board)
        })
      }
  
      const isSceneDirty = () => {
        return new Promise((resolve, reject) => {
          client.once('isSceneDirty', resolve)
          emit('isSceneDirty')
        })
      }

      const connectRequest = () => {
        console.log('Send connect request')
        emit('connectRequest')
      }

      client.on('willLoad', ({path}) => {
        resourcesMap[path] = {status: ResourcesMapStatuses.LOADING}
        ResourceInfo.emit('willLoad', path)
      })
      const getResource = (type, filePath) => {
        return new Promise((resolve, reject) => {
          console.log('Getting - ', filePath)

          if (resourcesMap[filePath] && resourcesMap[filePath].status === ResourcesMapStatuses.SUCCESS) {
            resolve(resourcesMap[filePath].data)
          }

          const Fn = (res) => {
            if (res.filePath === filePath) {
              console.log('Resolved(*), ', filePath, res)
              resourcesMap[filePath] = {status: ResourcesMapStatuses.SUCCESS, data: res}
              client.off('getResource', Fn)
              resolve(res)
            }
          }

          client.on('getResource', Fn)
          emit('getResource', {type, filePath})

          resourcesMap[filePath] = {status: ResourcesMapStatuses.PENDING}
          const interval = setInterval(() => {
            if (resourcesMap[filePath] && resourcesMap[filePath].status === ResourcesMapStatuses.PENDING) {
              emit('getResource', {type, filePath})
            } else {
              clearInterval(interval)
            }
          }, 10 * 1000)
        })
      }
  
      const ClientMiddleware = store => next => action => {
        /* Not send restricted actions */
        if (RestrictedActions.indexOf(action.type) !== -1) {
  
          /* Send deselect if we select something */
          if (SelectActions.indexOf(action.type) !== -1) {
            let meta = {ignore: [remoteStore.getState().id]}

            let selectionsBefore = getSelections(store.getState())

            const result = next(action)
            let selectionsAfter = getSelections(store.getState())
            
            const selectionsToBlock = selectionsAfter.filter(item => selectionsBefore.indexOf(item) === -1)
            const selectionsToUnblock = selectionsBefore.filter(item => selectionsAfter.indexOf(item) === -1)

            if (selectionsToUnblock.length) dispatchRemote(_unblockObject(selectionsToUnblock), meta) // Unblock deselected
            if (selectionsToBlock.length) dispatchRemote(_blockObject(selectionsToBlock), meta) // Block selected

            return result

            //dispatchRemote(deselectObject(action.payload), meta)
          }
  
          /* Dispatch */
          return next(action)
        }
        
        /* Dispatch if the message came from SG */
        if (action.meta && action.meta.isSG) {
          /* Are we listed on the ignore list? */
          let id = remoteStore.getState().id
          let isIgnored = action.meta.ignore && (action.meta.ignore.indexOf(id) !== 1) && (id !== null)
          
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
  
      const sendRemoteInfo = each((info) => {
        emit('remote', info)
      }, FRAME_RATE)
  
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
        connectRequest
      })
    })
  })
}
