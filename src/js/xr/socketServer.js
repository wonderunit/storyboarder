const ioCreate = require('socket.io')

const {getSerializedState, createObject, deleteObjects} = require('../shared/reducers/shot-generator')
const {userAction, DISABLED_ACTIONS} = require('./userAction')

const {skipCalls} = require("../utils/generators")

// FIXME DIRTY HACK v2.0, allows to update objects without dispatching an event
window.connectedClient = {}
const clients = {}
let sockets = []

const POSITION_EVENT = 'object-position'
const ACTION_EVENT = 'action'
const XR_CONTROLS_EVENT = 'xr-controls'
const XR_CONTROLS_COUNT_EVENT = 'xr-controls-count'
const XR_CLIENT_INFO_EVENT = 'xr-client-info'

function broadcast(event, msg) {
  for(let socket of sockets) {
    socket.emit(event, msg)
  }
}

const objectPositionSend = skipCalls((id, position) => {
  for(let socket of sockets) {
    socket.emit(POSITION_EVENT, {id, position, fromMainApp: true})
  }
}, 6)

const clientInfoSent = (id, payload) => {
  for(let socket of sockets) {
    socket.emit(XR_CLIENT_INFO_EVENT, {id, payload, fromMainApp: true})
  }
}

function onConnect(socket, store) {
  clients[socket.id] = socket
  
  sockets.push(socket);
  
  store.dispatch(createObject({
    id: socket.id,
    type: 'xrclient',
    x: 0, y: 0, z: 0,
    rotation: {x: 0, y: 0, z: 0},
  }))
}

function onDisconnect(socket, store) {
  Reflect.deleteProperty(clients, socket.id)
  
  sockets = sockets.filter((target) => target !== socket)
  
  store.dispatch(deleteObjects([socket.id]))
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

let onReduxAction = null

const actionMiddleware = ({ getState }) => {
  return next => action => {
    if (action.fromSubApp)
    debug('Will dispatch', action)
    
    onReduxAction && !action.fromSubApp && onReduxAction(action)
    
    return next(action)
  }
}

const createSocketServer = (http, store) => {
  const io = ioCreate(http, {transports: ['websocket'], wsEngine: 'ws'})
  debug('STORE', [store.getState(), store])
  
  io.on('connection', (socket) => {
    debug('IO', io)
    
    onConnect(socket, store)
    sendState(socket, store)
    
    socket.on('disconnect', () => {
      onDisconnect(socket, store)
    })
  
    let currentAction = null
    socket.on('dispatch', (payload) => {
      currentAction = payload
      store.dispatch({...currentAction, fromSubApp: true})
    
      socket.broadcast.emit(ACTION_EVENT, {...currentAction, fromMainApp: true})
    })
  
    socket.on(XR_CONTROLS_EVENT, (payload) => {
      if (window.connectedClient[socket.id]) {
        window.connectedClient[socket.id].update(payload)
      }
    })
  
    socket.on(XR_CONTROLS_COUNT_EVENT, (payload) => {
      if (window.connectedClient[socket.id]) {
        window.connectedClient[socket.id].setControllersCount(payload.count)
      }
    })
    
    onReduxAction = (payload) => {
      if (DISABLED_ACTIONS[payload.type]) {
        return false
      }
      
      io.emit(ACTION_EVENT, {...userAction(payload), fromMainApp: true})
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
  createSocketServer,
  broadcast,
  objectPositionSend,
  clientInfoSent
}
