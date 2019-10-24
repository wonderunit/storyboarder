const ioCreate = require('socket.io')

const {getSerializedState} = require('../shared/reducers/shot-generator')

const clients = {}
let sockets = []

function onConnect(socket) {
  clients[socket.id] = socket
  
  sockets.push(socket);
}

function onDisconnect(socket) {
  Reflect.deleteProperty(clients, socket.id)
  
  sockets = sockets.filter((target) => target !== socket)
}

function broadcast(event, msg) {
  for(let socket of sockets) {
    socket.emit(event, msg)
  }
}

function sendState(socket, store) {
  const state = store.getState()
  const { aspectRatio } = state
  
  socket.emit('state', {
    ...getSerializedState(state),
    
    aspectRatio,
    presets: {
      poses: state.presets.poses
    }
  })
}

function userAction(action) {
  switch (action.type) {
    case 'UPDATE_CHARACTER_IK_SKELETON':
      action.payload.skeleton = action.payload.skeleton.map((bone) => {
        bone.rotation = new THREE.Euler().setFromRotationMatrix(new THREE.Matrix4().fromArray(bone.object.matrix))
        
        return bone
      })
      break
  }
  
  
  return action
}

let onReduxAction = null

const actionMiddleware = ({ getState }) => {
  return next => action => {
    
    onReduxAction && !action.fromSubApp && onReduxAction(action)
    
    return next(action)
  }
}

const createSocketServer = (http, store) => {
  const io = ioCreate(http)
  
  io.on('connection', (socket) => {
    debug('IO', io)
    
    onConnect(socket)
    
    socket.on('disconnect', () => {
      onDisconnect(socket)
    })
  
    socket.on('get-state', () => {
      sendState(socket, store)
    })
  
    let currentAction = null
    socket.on('dispatch', (payload) => {
      currentAction = userAction(JSON.parse(payload))
  
      //debug('WILL DISPATCH FROM CLIENT', currentAction)
      store.dispatch({...currentAction, fromSubApp: true})
      
      socket.broadcast.emit('action', JSON.stringify({...currentAction, fromMainApp: true}))
    })
    
    onReduxAction = (payload) => {
      //debug('WILL DISPATCH', payload)
      io.emit('action', JSON.stringify({...payload, fromMainApp: true}))
    }
    
  })
}


function debug(msg, object) {
  if (!object) {
    console.log('%c %O', 'color: blue; font-weight: bold;', msg)
  } else {
    console.log('%c %s %O', 'color: blue; font-weight: bold;', msg, object)
  }
}

module.exports = {
  actionMiddleware,
  createSocketServer
}
