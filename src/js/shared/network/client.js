import SocketClient from 'socket.io-client'

import {RestrictedActions, remoteStore, setId, SelectActions} from "../reducers/remoteDevice"
import {deselectObject} from "../reducers/shot-generator"

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
  const client = SocketClient.connect(URI)

  let FRAME_RATE = {current: 10}

  const dispatchRemote = (action, meta = {}) => {
    const XRAction = {
      ...action,
      meta: {
        ...meta,
        isXR: true
      }
    }

    client.emit('action', XRAction)
  }
  
  const connectStore = (store) => {
    client.on('remoteAction', (data) => {
      remoteStore.dispatch(data)
    })

    client.on('action', (data) => {
      store.dispatch(data)
    })
  }

  const getBoards = async () => {
    return new Promise((resolve) => {
      client.once('getBoards', resolve)
      client.emit('getBoards')
    })
  };

  const saveShot = async () => {
    return new Promise((resolve) => {
      client.once('saveShot', resolve)
      client.emit('saveShot')
    })
  };

  const insertShot = () => {
    return new Promise((resolve) => {
      client.once('insertShot', resolve)
      client.emit('insertShot')
    })
  };

  const getSg = () => {
    return new Promise((resolve) => {
      client.once('getSg', resolve)
      client.emit('getSg')
    })
  };

  const setBoard = (board) => {
    return new Promise((resolve) => {
      client.once('setBoard', resolve)
      client.emit('setBoard', board)
    })
  };

  const isSceneDirty = () => {
    return new Promise((resolve) => {
      client.once('isSceneDirty', resolve)
      client.emit('isSceneDirty')
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
    client.emit('remote', info)
  }, FRAME_RATE)

  const setActive = (active = true) => {
    client.emit('remote', {active})
  }

  return {
    connectStore,
    
    sendInfo: (info, immediate) => sendRemoteInfo([info], immediate),
    setActive,
    log: (info) => client.emit('debug', info),
    
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
