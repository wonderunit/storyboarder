const { useState, useMemo, useRef, useCallback } = React = require('react')
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

    this.needsRender = false
  }
  render () {
    let canvas = this.canvas
    let ctx = this.context
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

const useUiManager = () => {
  const canvasRendererRef = useRef(null)
  const getCanvasRenderer = useCallback(() => {
    if (canvasRendererRef.current === null) {
      canvasRendererRef.current = new CanvasRenderer(1024)
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
