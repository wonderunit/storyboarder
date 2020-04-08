import {mergeState} from './../shared/reducers/shot-generator'
import {remoteStore, RestrictedActions, addUser, updateUser, removeUser} from './../shared/reducers/remoteDevice'

const IO = {current: null}

const dispatchRemote = (action) => {
  const SGAction = {
    ...action,
    meta: {isSG: true}
  }

  IO.current.emit('action', SGAction)
}

export const serve = (io, store) => {
  IO.current = io

  io.on('connection', (socket) =>g {
    
    const connectAction = addUser(socket.id)
    remoteStore.dispatch(connectAction)
    io.emit('remoteAction', connectAction)
    
    dispatchRemote(mergeState(store.getState()))
    socket.emit('id', socket.id)

    socket.on('action', (action) => {
      store.dispatch(action)
    })

    socket.on('remote', (info) => {
      const infoAction = updateUser(socket.id, info)
      
      remoteStore.dispatch(infoAction)
      io.emit('remoteAction', infoAction)
    })
    
    socket.on('disconnect', () => {
      const disconnectAction = removeUser(socket.id)
      
      remoteStore.dispatch(disconnectAction)
      io.emit('remoteAction', disconnectAction)
    })
    
    
  })

}

export const SGMiddleware = store => next => action => {
  if (!IO.current || (RestrictedActions.indexOf(action.type) !== -1)) {
    return next(action)
  }
  
  dispatchRemote(action)
  
  return next(action)
}

