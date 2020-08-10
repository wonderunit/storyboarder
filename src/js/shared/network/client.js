import {RestrictedActions, remoteStore, setId, SelectActions} from "../reducers/remoteDevice"
import {deselectObject} from "../reducers/shot-generator"
import P2P from './p2p'

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

export const connect = (URI = '') => {
  const urlParams = new URLSearchParams(window.location.search)
  const roomId = urlParams.get('id')

  if (!roomId) {
    alert('Room is not entered')
    return false
  }

  const p2p = P2P()
  const {io, peer, P2PClientConnection} = p2p

  let client, emit
  let store = {current: null}
  
  P2PClientConnection(roomId).then((conn) => {
    client = conn.emitter
    emit = conn.emit

    console.log('Connected !!!', store)

    client.on('remoteAction', (data) => {
      remoteStore.dispatch(data)
    })

    client.on('action', (data) => {
      console.log('Action', data)
      store.current.dispatch(data)
    })
  })
  
  let FRAME_RATE = {current: 10}

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
    store.current = appStore
  }

  const getBoards = async () => {
    return new Promise((resolve, reject) => {
      if (!client) {
        reject()
        return false
      }

      client.once('getBoards', resolve)
      emit('getBoards')
    })
  };

  const saveShot = async () => {
    return new Promise((resolve, reject) => {
      if (!client) {
        reject()
        return false
      }

      client.once('saveShot', resolve)
      emit('saveShot')
    })
  };

  const insertShot = () => {
    return new Promise((resolve, reject) => {
      if (!client) {
        reject()
        return false
      }

      client.once('insertShot', resolve)
      emit('insertShot')
    })
  };

  const getSg = () => {
    return new Promise((resolve, reject) => {
      if (!client) {
        reject()
        return false
      }

      client.once('getSg', resolve)
      emit('getSg')
    })
  };

  const setBoard = (board) => {
    return new Promise((resolve, reject) => {
      if (!client) {
        reject()
        return false
      }

      client.once('setBoard', resolve)
      emit('setBoard', board)
    })
  };

  const isSceneDirty = () => {
    return new Promise((resolve, reject) => {
      if (!client) {
        reject()
        return false
      }

      client.once('isSceneDirty', resolve)
      emit('isSceneDirty')
    })
  };

  const ClientMiddleware = store => next => action => {
    /* Not send restricted actions */
    if (RestrictedActions.indexOf(action.type) !== -1) {

      /* Send deselect if we select something */
      if (SelectActions.indexOf(action.type) !== -1) {
        let meta = {ignore: [remoteStore.getState().id]}
        dispatchRemote(deselectObject(action.payload), meta)
      }

      /* Dispatch */
      return next(action)
    }
    
    /* Dispatch if the message came from SG */
    if (action.meta && action.meta.isSG) {
      /* Are we listed on the ignore list? */
      let isIgnored = action.meta.ignore && action.meta.ignore.indexOf(remoteStore.getState().id) !== 1
      
      if (!isIgnored) {
        return next(action)
      }
    } else {
      /* Send to the SG */
      dispatchRemote(action)
    }
    // Not send actions to the reducer, instead wait for the server answer
  }

  const sendRemoteInfo = each((info) => {
    if (!client) {
      return false
    }

    emit('remote', info)
  }, FRAME_RATE)

  const setActive = (active = true) => {
    if (!client) {
      return false
    }

    emit('remote', {active})
  }

  return {
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
    isSceneDirty
  }
}
