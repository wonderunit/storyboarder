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
      let string = `${sceneObject.name || sceneObject.displayName}`
      ctx.font = '40pt Arial'
      ctx.textBaseline = 'top'
      ctx.fillStyle = 'black'
      ctx.fillText(string, 10, 10)
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
      store.subscribe(() => {
        canvasRendererRef.current.state.selections = getSelections(store.getState())
        canvasRendererRef.current.state.sceneObjects = getSceneObjects(store.getState())
        canvasRendererRef.current.needsRender = true
      })
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
