import SocketClient from 'socket.io-client'

import {mergeState} from './../reducers/shot-generator'
import {RestrictedActions, remoteStore, setId} from "../reducers/remoteDevice"

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

  const ClientMiddleware = store => next => action => {
    if (action.meta && action.meta.isSG || (RestrictedActions.indexOf(action.type) !== -1)) {
      return next(action)
    }

    const RemoteAction = {
      ...action,
      meta: {isRemote: true}
    }

    client.emit('action', RemoteAction)
    
    // Not send actions to the reducer, instead wait for the server answer
  }
  
  const sendRemoteInfo = each((info) => {
    client.emit('remote', info)
  }, FRAME_RATE)

  return {
    connectStore,
    sendInfo: (info, immediate) => sendRemoteInfo([info], immediate),
    ClientMiddleware,
    setFrameRate: (value) => {
      FRAME_RATE.current = value
    }
  }
}
