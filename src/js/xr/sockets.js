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

  io.on('connection', function (socket) {
    
    remoteStore.dispatch(addUser(socket.id))
    dispatchRemote(mergeState(store.getState()))
    io.emit('id', socket.id)

    socket.on('action', (action) => {
      store.dispatch(action)
    })

    socket.on('remote', (info) => {
      remoteStore.dispatch(updateUser(socket.id, info))
    })
    
    socket.on('disconnect', () => {
      remoteStore.dispatch(removeUser(socket.id))
    })
    
    
  })

}

export const SGMiddleware = store => next => action => {
  if (!IO.current || (action.meta && action.meta.isRemote) || (RestrictedActions.indexOf(action.type) !== -1)) {
    return next(action)
  }
  
  dispatchRemote(action)
  
  return next(action)
}

