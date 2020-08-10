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
import P2P from './../shared/network/p2p'

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

  IO.current.broadcast('action', SGAction)
}

const onUserConnect = (emit, broadcast, id, store) => {
  const connectAction = addUser(id)
  remoteStore.dispatch(connectAction)
  broadcast('remoteAction', connectAction)

  dispatchRemote(mergeState(store.getState()))
  emit('remoteAction', setId(id))
}

export const serve = (store, service) => {
  const peer = P2P()
  const {io, broadcast} = peer
  
  IO.current = peer

  io.on('open', (id) => {
    console.log('currentID: ', id)
  })

  io.on('error', (err) => {
    console.error(err)
  })

  io.on('disconnected', () => {
    console.log('Discconected from the lobby server')
  })
  
  io.on('connection', ({emitter, emit, id}) => {

    console.log('%c XR', 'color: #4CAF50', `User has been connected: ${id}`)
    onUserConnect(emit, broadcast, id, store)
    emitter.on('action', (action) => {
      store.dispatch(action)
    })

    emitter.on('debug', (data) => {
      console.log('%c Log', 'color: #0088ff', data)
    })

    emitter.on('remote', (info) => {
      const infoAction = updateUser(id, info)
      
      remoteStore.dispatch(infoAction)
      broadcast('remoteAction', infoAction)
    })
    
    emitter.on('close', (reason) => {
      console.log('%c XR', 'color: #4CAF50', `User has been disconnected: ${id}, because of the: ${reason}`)
      
      const disconnectAction = removeUser(id)
      
      remoteStore.dispatch(disconnectAction)
      broadcast('remoteAction', disconnectAction)
    })

    emitter.on('getBoards', async () => {
      emit('getBoards', await service.getBoards())
    })

    emitter.on('setBoard', async (uid) => {
      let boards = await service.getBoards()
      if (boards.find(board => board.uid === uid)) {
        console.log('New board ID: ', uid)
        await service.loadBoardByUid(uid)
      }
      
      emit('setBoard')
    })

    emitter.on('saveShot', async () => {
      await service.saveShot()
      emit('saveShot')
    })

    emitter.on('insertShot', async () => {
      emit('insertShot', await service.insertShot())
    })

    emitter.on('getSg', async () => {
      let board = await service.getBoard(store.getState().board.uid)
      emit('getSg', board)
    })

    emitter.on('isSceneDirty', () => {
      emit('isSceneDirty', getIsSceneDirty(store.getState()))
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

