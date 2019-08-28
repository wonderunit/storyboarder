// mkdir -p test/views/xr-ui/dist/data/system/xr/ui
// cp src/data/shot-generator/xr/ui/controls.glb test/views/xr-ui/dist/data/system/xr/ui/controls.glb
// cp test/fixtures/xr/xr.storyboarder test/views/xr-ui/dist
// parcel watch --no-hmr test/views/xr-ui/index.html -d test/views/xr-ui/dist
// cd test/views/xr-ui/dist
// budo

const THREE = require('three')
window.THREE = window.THREE || THREE
const { Canvas, useThree } = require('react-three-fiber')

const { Provider } = require('react-redux')
const useReduxStore = require('react-redux').useStore
const { useMemo, Suspense } = React = require('react')

const ReactDOM = require('react-dom')

const { useUiManager } = require('../../../src/js/xr/src/use-ui-manager')
const { Log } = require('../../../src/js/xr/src/components/Log')
const Controls = require('../../../src/js/xr/src/components/ui/Controls')

const UITestContent = () => {
  const { gl, camera, scene } = useThree()

  const { uiService, uiState, getCanvasRenderer } = useUiManager()

  useMemo(() => {
    scene.background = new THREE.Color(0x000000)
  }, [])

  const fakeController = useMemo(() => new THREE.Group(), [])

  const onPointerDown = event => {
    uiService.send({
      type: 'TRIGGER_START',
      controller: fakeController,
      intersection: {
        uv: event.uv
      }
    })
  }
  const onPointerUp = event => {
    uiService.send({
      type: 'TRIGGER_END',
      controller: fakeController,
      intersection: {
        uv: event.uv
      }
    })
  }
  return (
    <>
      <group>
        <primitive object={camera}>
          <Log position={[0, -0.15, -1]} />
        </primitive>

        <group
          position={[0.35, -0.15, 4.55]}
        >
          <Suspense fallback={null}>
            <group
              onPointerDown={onPointerDown}
              onPointerUp={onPointerUp}
            >
              <Controls
                mode={uiState.value}
                getCanvasRenderer={getCanvasRenderer}
              />
            </group>
          </Suspense>
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

const UITest = () => {
  const store = useReduxStore()
  return (
    <>
      <Canvas>
        <Provider store={store}>
          <Suspense fallback={null}>
            <UITestContent />
          </ Suspense>
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
      presets: { poses: {} }
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

