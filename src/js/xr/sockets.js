import {deselectObject, mergeState} from './../shared/reducers/shot-generator'
import {
  remoteStore,
  RestrictedActions,
  addUser,
  updateUser,
  removeUser,
  SelectActions
} from './../shared/reducers/remoteDevice'

const IO = {current: null}

const dispatchRemote = (action) => {
  const SGAction = {
    ...action,
    meta: {isSG: true}
  }

  IO.current.emit('action', SGAction)
}

const onUserConnect = (io, socket, store) => {
  const connectAction = addUser(socket.id)
  remoteStore.dispatch(connectAction)
  io.emit('remoteAction', connectAction)

  dispatchRemote(mergeState(store.getState()))
  socket.emit('id', socket.id)
}

export const serve = (io, store, service) => {
  IO.current = io

  io.on('connection', (socket) => {

    onUserConnect(io, socket, store)
    
    socket.on('action', (action) => {
      store.dispatch(action)
    })

    socket.on('debug', (data) => {
      console.log('%c Log', 'color: #0088ff', data)
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
    if (SelectActions.indexOf(action.type) !== -1) {
      dispatchRemote(deselectObject(action.payload))
    }
    
    return next(action)
  }
  
  dispatchRemote(action)
  
  return next(action)
}

