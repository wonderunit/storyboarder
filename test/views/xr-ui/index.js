// ./scripts/run-xr-ui-canvas-test.sh
const THREE = require('three')
window.THREE = window.THREE || THREE
const { Canvas, useThree } = require('react-three-fiber')

const { Provider } = require('react-redux')
const useReduxStore = require('react-redux').useStore
const { useMemo, useRef, useState, useEffect } = React = require('react')

const ReactDOM = require('react-dom')

const { useStore, useStoreApi, useInteractionsManager } = require('../../../src/js/xr/src/use-interactions-manager')
const { useUiManager, UI_ICON_FILEPATHS } = require('../../../src/js/xr/src/use-ui-manager')
const { Log } = require('../../../src/js/xr/src/components/Log')
const Controls = require('../../../src/js/xr/src/components/ui/Controls')

const SimpleText = require('../../../src/js/xr/src/components/SimpleText')

const useGltfLoader = require('../../../src/js/xr/src/hooks/use-gltf-loader')
const useImageBitmapLoader = require('../../../src/js/xr/src/hooks/use-imagebitmap-loader')

const UITestContent = ({ resources }) => {
  const { gl, camera, scene } = useThree()

  const { uiService, uiCurrent, getCanvasRenderer } = useUiManager({
    playSound: () => { },
    stopSound: () => { }
  })

  const { controllers, interactionServiceCurrent } = useInteractionsManager({
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
    let u = event.uv.x
    let v = event.uv.y
    uiService.send({
      type: 'TRIGGER_START',
      controller: getFakeController(),
      intersection: {
        uv: event.uv
      }
    })
  }
  const onPointerUp = event => {
    let u = event.uv.x
    let v = event.uv.y
    uiService.send({
      type: 'TRIGGER_END',
      controller: getFakeController(),
      intersection: {
        uv: event.uv
      }
    })
  }
  const onPointerMove = event => {
    getFakeController().position.copy(event.point)
  }
  return (
    <>
      <group>
        <primitive object={camera}>
          <Log position={[0, -0.15, -1]} />
        </primitive>

        <group
          position={[0, 0, 4.30]}
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
          </group>
        </group>
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
    <SimpleText
      label={'Loading ...'}
      position={[0, 0, 0]}
      textProps={{
        color: 0xaaaaaa,
        scale: 10
      }}
    />
  </group>
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
const { reducer, initialState } = require('../../../src/js/shared/reducers/shot-generator')

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
    store.dispatch({ type: 'SELECT_OBJECT', payload: '26332F12-28FE-444C-B73F-B3F90B8C62A2' })

    window.$r = { store }

    ReactDOM.render(
      <Provider store={store}>
        <UITest />
      </Provider>,
      document.getElementById('main')
    )
  })
