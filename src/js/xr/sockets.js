import {deselectObject, mergeState, getIsSceneDirty} from './../shared/reducers/shot-generator'
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
  if (!IO.current) {
    return false
  }
  
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

  const validSameBoard = uid => store.getState().board.uid === uid

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

    socket.on('getBoards', async () => {
      console.log('boards', await service.getBoards())
      socket.emit('getBoards', await service.getBoards())
    })

    socket.on('saveShot', async () => {
      console.log('Saving')
      await service.saveShot()
      socket.emit('saveShot')
    })

    socket.on('insertShot', async () => {
      await service.insertShot()
      socket.emit('insertShot')
    })

    socket.on('getSg', async () => {
      let board = await service.getBoard(store.getState().board.uid)
      console.log('Board', board)
      socket.emit('getSg', board)
    })

    socket.on('isSceneDirty', () => {
      socket.emit('isSceneDirty', getIsSceneDirty(store.getState()))
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

