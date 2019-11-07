const THREE = require('three')
window.THREE = THREE

const React = require('react')
const ReactDOM = require('react-dom')
const thunkMiddleware = require('redux-thunk').default

const io = require('socket.io-client')

const SceneManagerXR = require('./SceneManagerXR')

const {createStore, applyMiddleware} = require('redux')
const {Provider} = require('react-redux')

const {reducer, initialState, updateObject, selectObject} = require('../../shared/reducers/shot-generator')
const {userAction, DISABLED_ACTIONS} = require('../socket-server/userAction')
const {
  STATE_EVENT,
  DISPATCH_EVENT,
  ACTION_EVENT,
  POSITION_EVENT,
  XR_CLIENT_POSITION_EVENT
} = require('../socket-server/actions')


let onReduxAction = null

const setupXR = () => {
  let store = null
  
  const setupScene = (result, networkId) => {
    const { aspectRatio, activeCamera, sceneObjects, world, presets } = result
    store = configureStore({
      aspectRatio,
      undoable: {
        ...initialState.undoable,
        sceneObjects,
        world,
        activeCamera
      },
      models: initialState.models,
      presets: {
        poses: presets.poses,
        characters: {},
        scenes: {}
      }
    })
  
    ReactDOM.render(
        <Provider store={store}>
          <SceneManagerXR networkId={networkId}/>
        </Provider>,
        document.getElementById('main')
    )
  }
  
  let wsAddress = location.href.replace('http', 'ws')
  wsAddress = wsAddress.replace('https', 'wss')
  
  const socket = io(wsAddress, {transports: ['websocket'], wsEngine: 'ws'})
  window.mainAppSocket = socket
  
  socket.on('connect', function () {
    
    //We were connected before, must reload page to get the new store
    if (store) {
      location.reload()
      
      return false
    }
    
    socket.on(STATE_EVENT, (state) => {
      if (!store) {
        setupScene(state, socket.id)
  
        onReduxAction = (action) => {
          if (DISABLED_ACTIONS[action.type]) {
            return false
          }
          
          socket.emit(DISPATCH_EVENT, userAction(action))
        }
        
        return false
      }
    })
  
    socket.on(ACTION_EVENT, (action) => {
      if (store) {
        // Remove the selection from the object that we want to delete
        if (action.type === 'DELETE_OBJECTS') {
          let state = store.getState()
          
          let selected = state.undoable.present.selections.filter((target) => {
            return (action.payload.ids.indexOf(target) === -1)
          })
          
          if (selected.length !== state.undoable.present.selections.length) {
            store.dispatch(selectObject(null))
          }
        }
        
        if (action.isRemoteUser && action.payload) {
          action.payload.remoteUpdate = true
        }
        
        store.dispatch(action)
      }
    })
  
    socket.on(POSITION_EVENT, (payload) => {
      if (store) {
        store.dispatch({
          ...updateObject(payload.id, {
            x: payload.position.x,
            y: payload.position.z,
            z: payload.position.y,
            remoteUpdate: true
          }),
          fromMainApp: true
        })
      }
    })
    
    socket.on(XR_CLIENT_POSITION_EVENT, (payload) => {
      if (store) {
        store.dispatch({
          ...updateObject(payload.id, {xrClientParts: payload.parts}),
          fromMainApp: true
        })
      }
    })
  })
  
}

const actionMiddleware = ({ getState }) => {
  return next => action => {
    
    onReduxAction && !action.fromMainApp && onReduxAction(action)
    
    return next(action)
  }
}

const configureStore = preloadedState => {
  const store = createStore(reducer, preloadedState, applyMiddleware(thunkMiddleware, actionMiddleware))
  window.$r = { store }
  return store
}

setupXR()
