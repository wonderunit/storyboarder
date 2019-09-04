// mkdir -p test/views/xr-ui/dist/data/system/xr/ui
// cp src/data/shot-generator/xr/ui/controls.glb test/views/xr-ui/dist/data/system/xr/ui/controls.glb
// cp test/fixtures/xr/xr.storyboarder test/views/xr-ui/dist
// npx parcel serve --no-hmr test/views/xr-ui/index.html -d test/views/xr-ui/dist -p 9966

const THREE = require('three')
window.THREE = window.THREE || THREE
const { Canvas, useThree } = require('react-three-fiber')

const { Provider } = require('react-redux')
const useReduxStore = require('react-redux').useStore
const { useMemo, useRef, Suspense } = React = require('react')

const ReactDOM = require('react-dom')

const { useUiManager } = require('../../../src/js/xr/src/use-ui-manager')
const { Log } = require('../../../src/js/xr/src/components/Log')
const Controls = require('../../../src/js/xr/src/components/ui/Controls')

const UITestContent = () => {
  const { gl, camera, scene } = useThree()

  const { uiService, uiState, getCanvasRenderer } = useUiManager()

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
    let canvasIntersection = getCanvasRenderer().getCanvasIntersection(u, v)
    uiService.send({
      type: 'TRIGGER_START',
      controller: getFakeController(),
      canvasIntersection,
      intersection: {
        uv: event.uv
      }
    })
  }
  const onPointerUp = event => {
    let u = event.uv.x
    let v = event.uv.y
    let canvasIntersection = getCanvasRenderer().getCanvasIntersection(u, v)
    uiService.send({
      type: 'TRIGGER_END',
      controller: getFakeController(),
      canvasIntersection,
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
          position={[0.35, -0.15, 4.55]}
          rotation={[0.8, 0, 0]}
        >
          <Suspense fallback={null}>
            <group
              onPointerDown={onPointerDown}
              onPointerUp={onPointerUp}
              onPointerMove={onPointerMove}
            >
              <Controls
                mode={uiState ? uiState.value : null}
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
