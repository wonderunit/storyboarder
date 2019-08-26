const { useState, useMemo, useRef } = React = require('react')
const { interpret } = require('xstate/lib/interpreter')

const { log } = require('./components/Log')
const uiMachine = require('./machines/uiMachine')

class CanvasRenderer {
  constructor(size) {
    this.canvas = document.createElement('canvas')
    this.canvas.width = this.canvas.height = size
    this.context = this.canvas.getContext('2d')
  }
  render() {
    let canvas = this.canvas
    let ctx = this.context
  }
  drawCircle (u, v) {
    let ctx = this.context

    let x = u * this.canvas.width
    let y = v * this.canvas.height

    console.log('drawCircle', x, y)

    ctx.beginPath()
    ctx.arc(x, y, 5, 0, Math.PI * 2)
    ctx.fillStyle = 'red'
    ctx.fill()
  }
}

const useUiManager = () => {
  const canvasRendererRef = useRef(null)
  const getCanvasRenderer = () => {
    if (canvasRendererRef.current === null) {
      canvasRendererRef.current = new CanvasRenderer(1024)
    }
    return canvasRendererRef.current
  }

  const [uiState, setUiState] = useState()

  const uiService = useMemo(
    () => interpret(uiMachine).onTransition(state => setUiState(state)).start(),
    []
  )

  uiMachine.options.actions = {
    ...uiMachine.options.actions,

    trigger (context, event) {
      let u = event.intersection.uv.x
      let v = event.intersection.uv.y
      log('ui trigger @', u, v)
      getCanvasRenderer().drawCircle(u, v)
    },

    onDrawingEntry () {
      log('onDrawingEntry')
    },

    onDrawingExit () {
      log('onDrawingExit')
    }
  }

  return { uiService, uiState, getCanvasRenderer }
}

module.exports = {
  useUiManager
}
