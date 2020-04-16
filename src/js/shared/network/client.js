import SocketClient from 'socket.io-client'

import {mergeState} from './../reducers/shot-generator'
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
  
  const connectStore = (store) => {
    client.on('state', (data) => {
      store.dispatch(mergeState(data))
    })

    client.on('id', (data) => {
      remoteStore.dispatch(setId(data))
    })

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

  const isSceneDirty = () => {
    return new Promise((resolve) => {
      client.once('isSceneDirty', resolve)
      client.emit('isSceneDirty')
    })
  };

  const ClientMiddleware = store => next => action => {
    if (action.meta && action.meta.isSG || (RestrictedActions.indexOf(action.type) !== -1)) {
      if (SelectActions.indexOf(action.type) !== -1) {
        client.emit('action', deselectObject(action.payload))
      }
      
      return next(action)
    }

    client.emit('action', action)
    
    // Not send actions to the reducer, instead wait for the server answer
  }
  
  const sendRemoteInfo = each((info) => {
    client.emit('remote', info)
  }, FRAME_RATE)

  return {
    connectStore,
    
    sendInfo: (info, immediate) => sendRemoteInfo([info], immediate),
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
    isSceneDirty
  }
}
