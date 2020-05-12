// ./scripts/run-xr-ui-canvas-test.sh
const THREE = require('three')
window.THREE = window.THREE || THREE
const { Canvas, useThree } = require('react-three-fiber')

const { Provider, useSelector } = require('react-redux')
const useReduxStore = require('react-redux').useStore
const { useMemo, useRef, useState, useEffect } = React = require('react')

const ReactDOM = require('react-dom')

const { useStore, useStoreApi, useInteractionsManager } = require('../../../src/js/xr/src/use-interactions-manager')
const { useUiStore, useUiManager, UI_ICON_FILEPATHS } = require('../../../src/js/xr/src/hooks/ui-manager')
const { Log } = require('../../../src/js/xr/src/components/Log')
const Controls = require('../../../src/js/xr/src/components/ui/Controls')
const Help = require('../../../src/js/xr/src/components/ui/Help')
const Boards = require('../../../src/js/xr/src/components/ui/Boards')


//const SimpleText = require('../../../src/js/xr/src/components/SimpleText')

const useGltfLoader = require('../../../src/js/xr/src/hooks/use-gltf-loader')
const useImageBitmapLoader = require('../../../src/js/xr/src/hooks/use-imagebitmap-loader')

const XRClient = require('../../../src/js/xr/src/client')
const xrClient = XRClient('http://localhost:1234')

const UITestContent = ({ resources }) => {
  const { gl, camera, scene } = useThree()

  const { uiService, uiCurrent, getCanvasRenderer, canvasRendererRef } = useUiManager({
    playSound: () => { },
    stopSound: () => { },
    getXrClient: () => xrClient
  })

  const { interactionServiceCurrent } = useInteractionsManager({
    groundRef: null,
    uiService,
    playSound: () => {},
    stopSound: () => {}
  })

  useMemo(() => {
    scene.background = new THREE.Color(0x888888)
  }, [])

  const fakeController = useRef()
  const getFakeController = () => {
    if (!fakeController.current) {
      fakeController.current = new THREE.Group()
      fakeController.current.name = 'Mouse (Fake Controller)'
      scene.add(fakeController.current)
    }
    return fakeController.current
  }

  const onPointerDown = event => {
    let offset = event.receivingObject.userData.id === 'boards' ? 1 : 0
    let u = event.uv.x + offset
    let v = event.uv.y
    uiService.send({
      type: 'TRIGGER_START',
      controller: getFakeController(),
      intersection: {
        uv: new THREE.Vector2(u, v)
      }
    })
  }
  const onPointerUp = event => {
    let offset = event.receivingObject.userData.id === 'boards' ? 1 : 0
    let u = event.uv.x + offset
    let v = event.uv.y
    uiService.send({
      type: 'TRIGGER_END',
      controller: getFakeController(),
      intersection: {
        uv: new THREE.Vector2(u, v)
      }
    })
  }
  const onPointerMove = event => {
    getFakeController().position.copy(event.point)
  }

  const showHelp = useUiStore(state => state.showHelp)
  const showHUD = useUiStore(state => state.showHUD)
  const showConfirm = useUiStore(state => state.showConfirm)

  return (
    <>
      <group>
        <primitive object={camera}>
          <Log position={[0, -0.575, -1]} />
        </primitive>

        <group
          position={[0, -0.425, 4.30]}
          rotation={[0.8, 0, 0]}
          scale={[2.4,2.4,2.4]}
        >
          <group
            onPointerDown={onPointerDown}
            onPointerUp={onPointerUp}
            onPointerMove={onPointerMove}
          >
            <Controls
              gltf={resources.controlsGltf}
              mode={uiCurrent.value.controls}
              getCanvasRenderer={getCanvasRenderer}
            />
            {
              showHelp && <Help
                mode={uiCurrent.value.controls}
                getCanvasRenderer={getCanvasRenderer} />
            }
          </group>
        </group>
      
        { showHUD &&
          <group
          position={[0, -0.05, 0.25]}
          scale={[1, 1, 1]}>
            <group
              onPointerDown={onPointerDown}
              onPointerUp={onPointerUp}
              onPointerMove={onPointerMove}
            >
              <Boards
                rotation={Math.PI}
                mode={uiCurrent.value.controls}
                getCanvasRenderer={getCanvasRenderer}
                showConfirm={showConfirm}
                showSettings={canvasRendererRef.current.state.showSettings} />
            </group>
          </group>
        }
      </group>
      

      <ambientLight color={0xffffff} intensity={1} />

      <directionalLight
        color={0xffffff}
        position={[0, 1.5, 0]}
        target-position={[0, 0, 0.4]}
      />
    </>
  )
}

const LoadingMessage = () => {
  return <group>
  </group>
//   return <group>
//   <SimpleText
//     label={'Loading ...'}
//     position={[0, 0, 0]}
//     textProps={{
//       color: 0xaaaaaa,
//       scale: 10
//     }}
//   />
// </group>
}

const UITest = () => {
  useMemo(() => {
    THREE.Cache.enabled = true
  }, [])

  const store = useReduxStore()

  const controlsGltf = useGltfLoader('/data/system/xr/ui/controls.glb')
  const icons = UI_ICON_FILEPATHS.map(useImageBitmapLoader)

  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!ready) {
      if (icons.some(n => n == null)) return
      if (!controlsGltf) return

      setReady(true)
    }
  }, [ready, icons, controlsGltf])

  return (
    <>
      <Canvas>
        <Provider store={store}>
          {
            ready
              ? <UITestContent resources={{ controlsGltf }} />
              : <LoadingMessage />
          }
        </Provider>
      </Canvas>
    </>
  )
}

const { createStore, applyMiddleware } = require('redux')
const thunkMiddleware = require('redux-thunk').default
const { reducer, initialState, getSelections, getSceneObjects } = require('../../../src/js/shared/reducers/shot-generator')

const configureStore = state => createStore(reducer, state, applyMiddleware(thunkMiddleware))

fetch('/xr.storyboarder')
  .then(response => response.json())
  .then(scene => {
    const store = configureStore({
      aspectRatio: scene.aspectRatio,
      models: initialState.models,
      presets: initialState.presets
    })
    store.dispatch({ type: 'LOAD_SCENE', payload: scene.boards[0].sg.data })

    const selectFirstObjectByType = type => {
      let sceneObject =
        Object.values(scene.boards[0].sg.data.sceneObjects).find(o => o.type === type)
      store.dispatch({ type: 'SELECT_OBJECT', payload: sceneObject.id })
    }

    window.$r = { store }

    selectFirstObjectByType('character')

    const Selector = () => {
      let selections = useSelector(getSelections)
      let selection = selections.length > 0 && selections[0]
      let sceneObjects = useSelector(getSceneObjects)
      let sceneObject = selection && sceneObjects[selection]

      const onChange = event => {
        if (event.target.value == '') {
          store.dispatch({ type: 'SELECT_OBJECT', payload: null })
        } else {
          selectFirstObjectByType(event.target.value)
        }
      }

      return (
        <div style={{ height: '33vh', padding: 12, backgroundColor: '#eee' }}>
          Select first:&nbsp;
          <select onChange={onChange} value={sceneObject.type || ''}>
            <option value="">(null)</option>
            <option value="character">Character</option>
            <option value="object">ModelObject</option>
            <option value="light">Light</option>
            <option value="camera">Camera</option>
          </select>
        </div>
      )
    }

    ReactDOM.render(
      <Provider store={store}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <UITest />
          <Selector />
        </div>
      </Provider>,
      document.getElementById('main')
    )
  })
