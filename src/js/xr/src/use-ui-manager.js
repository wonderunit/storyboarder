const { useState, useMemo, useRef, useCallback } = React = require('react')
const useReduxStore = require('react-redux').useStore
const { useRender, useThree } = require('react-three-fiber')
const { interpret } = require('xstate/lib/interpreter')

const { log } = require('./components/Log')
const uiMachine = require('./machines/uiMachine')
const getControllerIntersections = require('./helpers/get-controller-intersections')

class CanvasRenderer {
  constructor (size) {
    this.canvas = document.createElement('canvas')
    this.canvas.width = this.canvas.height = size
    this.context = this.canvas.getContext('2d')

    this.state = {
      selections: [],
      sceneObjects: {}
    }

    this.needsRender = false
  }
  render () {
    let canvas = this.canvas
    let ctx = this.context

    this.context.fillStyle = 'white'
    this.context.fillRect(0, 0, this.canvas.width, this.canvas.height)

    if (this.state.selections.length) {
      let id = this.state.selections[0]
      let sceneObject = this.state.sceneObjects[id]

      ctx.save()

      // name
      ctx.save()
      let string = `${sceneObject.name || sceneObject.displayName}`
      ctx.font = '40px Arial'
      ctx.textBaseline = 'top'
      ctx.fillStyle = 'black'
      ctx.translate(15, 20)
      ctx.fillText(string, 0, 0)
      ctx.restore()

      // spacer
      ctx.translate(0, 60)

      //
      ctx.save()
      ctx.font = '30px Arial'
      ctx.textBaseline = 'top'
      ctx.fillStyle = 'black'
      ctx.translate(15, 20)
      sceneObject.rotation.y
        ? ctx.fillText('rotation:' + (sceneObject.rotation.y * THREE.Math.RAD2DEG).toFixed(2) + '°', 0, 0)
        : ctx.fillText('rotation:' + (sceneObject.rotation * THREE.Math.RAD2DEG).toFixed(2) + '°', 0, 0)
      ctx.restore()

      // button
      ctx.save()
      ctx.translate(0, 60)
      ctx.translate(15, 15)
      ctx.fillStyle = '#eee'
      ctx.fillRect(0, 0, 420, 50)

      let { e, f } = ctx.getTransform()
      console.log('hit state:', e, f, 'to', e + 420, f + 50)

      ctx.translate(420/2, 50/2)
      ctx.font = '20px Arial'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillStyle = 'black'
      ctx.fillText('Rotate 45°', 0, 0)
      ctx.restore()

      ctx.restore()

      // hit state
      ctx.save()
      ctx.fillStyle = 'red'
      ctx.globalAlpha = 0.5
      ctx.fillRect(15, 135, 420, 50)
      ctx.globalAlpha = 1
      ctx.restore()
    }
  }

  trigger (u, v) {
    let x = u * this.canvas.width
    let y = v * this.canvas.height

    if (
      x > 15 && x < 435 &&
      y > 135 && y < 185
    ) {
      let id = this.state.selections[0]
      let sceneObject = this.state.sceneObjects[id]

      this.state.dispatch(
        updateObject(
          this.state.selections[0],
          sceneObject.rotation.y
            ? { rotation: { ...sceneObject.rotation, y: 45 * THREE.Math.DEG2RAD + sceneObject.rotation.y }}
            : { rotation: 45 * THREE.Math.DEG2RAD + sceneObject.rotation }
        )
      )
    }
  }

  drawCircle (u, v) {
    let ctx = this.context

    let x = u * this.canvas.width
    let y = v * this.canvas.height

    ctx.beginPath()
    ctx.arc(x, y, 5, 0, Math.PI * 2)
    ctx.fillStyle = 'red'
    ctx.fill()

    this.needsRender = true
  }
}

const {
  getSceneObjects,
  getSelections,
  selectObject,
  updateObject
} = require('../../shared/reducers/shot-generator')

const useUiManager = () => {
  const store = useReduxStore()

  const canvasRendererRef = useRef(null)
  const getCanvasRenderer = useCallback(() => {
    if (canvasRendererRef.current === null) {
      canvasRendererRef.current = new CanvasRenderer(1024)
      canvasRendererRef.current.render()

      canvasRendererRef.current.state.dispatch = store.dispatch
      const update = () => {
        canvasRendererRef.current.state.selections = getSelections(store.getState())
        canvasRendererRef.current.state.sceneObjects = getSceneObjects(store.getState())
        canvasRendererRef.current.needsRender = true
      }
      store.subscribe(update)
      update()
    }
    return canvasRendererRef.current
  }, [])

  const [uiState, setUiState] = useState()

  const { gl, scene } = useThree()

  const uiService = useMemo(
    () => interpret(uiMachine).onTransition(state => setUiState(state)).start(),
    []
  )

  // simple state stuff
  const draggingController = useRef()

  uiMachine.options.actions = {
    ...uiMachine.options.actions,

    onTriggerStart (context, event) {
      let u = event.intersection.uv.x
      let v = event.intersection.uv.y
      getCanvasRenderer().trigger(u, v)
    },

    onDraggingEntry (context, event) {
      draggingController.current = event.controller
    },

    onDraggingExit (context, event) {
      draggingController.current = null
    },

    drag (context, event) {
      let u = event.intersection.uv.x
      let v = event.intersection.uv.y
      getCanvasRenderer().drawCircle(u, v)
    }
  }

  useRender(() => {
    let mode = uiService.state.value

    if (mode === 'dragging') {
      let controller = draggingController.current

      let uis = scene.__interaction.filter(o => o.userData.type == 'ui')
      let intersections = getControllerIntersections(controller, uis)
      let intersection = intersections.length && intersections[0]

      if (intersection) {
        uiService.send({ type: 'CONTROLLER_INTERSECTION', controller, intersection })
      }
    }
  }, false, [uiService.state.value, draggingController.current])

  return { uiService, uiState, getCanvasRenderer }
}

module.exports = {
  useUiManager
}
