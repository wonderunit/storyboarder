import {deselectObject, mergeState, getIsSceneDirty} from './../shared/reducers/shot-generator'
import {
  remoteStore,
  RestrictedActions,
  addUser,
  updateUser,
  removeUser,
  setId,
  SelectActions
} from './../shared/reducers/remoteDevice'

const IO = {current: null}

const dispatchRemote = (action, meta = {}) => {
  if (!IO.current) {
    return false
  }
  
  const SGAction = {
    ...action,
    meta: {
      ...meta,
      isSG: true
    }
  }

  IO.current.emit('action', SGAction)
}

const onUserConnect = (io, socket, store) => {
  const connectAction = addUser(socket.id)
  remoteStore.dispatch(connectAction)
  io.emit('remoteAction', connectAction)

  dispatchRemote(mergeState(store.getState()))
  socket.emit('remoteAction', setId(socket.id))
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

    socket.on('getBoards', async () => {
      socket.emit('getBoards', await service.getBoards())
    })

    socket.on('setBoard', async (uid) => {
      let boards = await service.getBoards()
      if (boards.find(board => board.uid === uid)) {
        console.log('New board ID: ', uid)
        await service.loadBoardByUid(uid)
      }
      
      socket.emit('setBoard')
    })

    socket.on('saveShot', async () => {
      await service.saveShot()
      socket.emit('saveShot')
    })

    socket.on('insertShot', async () => {
      socket.emit('insertShot', await service.insertShot())
    })

    socket.on('getSg', async () => {
      let board = await service.getBoard(store.getState().board.uid)
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
      let copy = {...action}
      dispatchRemote(deselectObject(copy.payload), {ignoreSG: true})
    }
    
    return next(action)
  }
  
  if (action.meta && action.meta.ignoreSG) {
    return false
  }
  
  dispatchRemote(action, action.meta)
  return next(action)
}

