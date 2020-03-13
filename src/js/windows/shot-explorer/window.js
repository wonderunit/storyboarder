const ReactDOM = require('react-dom')
const { useEffect } = React = require('react')
const { ipcRenderer, shell } = electron = require('electron')
const { Provider, connect } = require('react-redux')

const { createStore, applyMiddleware, compose } = require('redux')
const thunkMiddleware = require('redux-thunk').default
const { reducer } = require('../../shared/reducers/shot-generator')
const presetsStorage = require('../../shared/store/presetsStorage')
const { initialState } = require('../../shared/reducers/shot-generator')


const { 
  getSelections, 
  selectObject,
  getSceneObjects,
  setActiveCamera } = require('../../shared/reducers/shot-generator') 

const poses = require('../../shared/reducers/shot-generator-presets/poses.json')

let sendedAction = null

const actionSanitizer = action => (
    action.type === 'ATTACHMENTS_SUCCESS' && action.payload ?
    { ...action, payload: { ...action.payload, value: '<<DATA>>' } } : action
  )
  const stateSanitizer = state => state.attachments ? { ...state, attachments: '<<ATTACHMENTS>>' } : state
  const reduxDevtoolsExtensionOptions = {
    actionSanitizer,
    stateSanitizer,
    trace: true,
  }
  const composeEnhancers = (
      window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ &&
      window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__(reduxDevtoolsExtensionOptions)
    ) || compose
  const configureStore = function configureStore (preloadedState) {
    const store = createStore(
      reducer,
      preloadedState,
      composeEnhancers(
        applyMiddleware(
            thunkMiddleware, store => next => action => {
              if(action && sendedAction && action !== sendedAction) {
                ipcRenderer.send("shot-generator:updateStore", action)
              }
              next(action)
            })
      )
    )
    return store
  }


const store = configureStore({
  ...initialState,
  presets: {
    ...initialState.presets,
    scenes: {
      ...initialState.presets.scenes,
      ...presetsStorage.loadScenePresets().scenes
    },
    characters: {
      ...initialState.presets.characters,
      ...presetsStorage.loadCharacterPresets().characters
    },
    poses: {
      ...initialState.presets.poses,
      ...poses,
      ...presetsStorage.loadPosePresets().poses
    },
    handPoses: {
      ...initialState.presets.handPoses,
      ...presetsStorage.loadHandPosePresets().handPoses
    }
  },
})
ipcRenderer.on("shot-explorer:updateStore", (event, action) => {
  sendedAction = action
  store.dispatch(action)
})

const Element = connect((state) => (
{
  mainViewCamera: state.mainViewCamera,
  selections: getSelections(state),
  sceneObjects: getSceneObjects(state)
}), 
{
  setActiveCamera
})
( React.memo(({ 
  mainViewCamera,
  selections,
  sceneObjects,
  setActiveCamera
}) => {
  useEffect(() => {
    let camera = Object.values(sceneObjects).filter(o => o.type === "camera")[0]
    setActiveCamera(camera.id)
  }, [selections])
  return mainViewCamera;
}))
ReactDOM.render(
  (store && <Provider store={ store }>
    <Element/>
  </Provider> ),
document.getElementById('main')
  )

