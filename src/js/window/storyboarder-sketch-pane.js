const EventEmitter = require('events').EventEmitter

const SketchPane = require('../sketch-pane')
const Brush = require('../sketch-pane/brush')
const LineMileageCounter = require('./line-mileage-counter')

const keytracker = require('../utils/keytracker')

/**
 *  Wrap the SketchPane component with features Storyboarder needs
 *
 *  Adds a `div.container` to contain the SketchPane. Updated on resize to fit within workspace.
 *
 *  @param {HTMLElement} el reference to the container element, e.g. reference to div#storyboarder-sketch-pane
 *  @param {array} canvasSize array of [width, height]. width is always 900.
 */
class StoryboarderSketchPane extends EventEmitter {
  constructor (el, canvasSize) {
    super()

    this.cancelTransform() // set Drawing Strategy

    this.containerPadding = 100

    // HACK hardcoded
    this.visibleLayersIndices = [0, 1, 3] // reference, main, notes
    this.compositeIndex = 5 // composite

    this.canvasPointerUp = this.canvasPointerUp.bind(this)
    this.canvasPointerDown = this.canvasPointerDown.bind(this)
    this.canvasPointerMove = this.canvasPointerMove.bind(this)
    this.canvasPointerOver = this.canvasPointerOver.bind(this)
    this.canvasPointerOut = this.canvasPointerOut.bind(this)
    this.canvasCursorMove = this.canvasCursorMove.bind(this)
    this.stopMultiLayerOperation = this.stopMultiLayerOperation.bind(this)
    this.onKeyDown = this.onKeyDown.bind(this)
    this.onKeyUp = this.onKeyUp.bind(this)

    this.el = el
    this.canvasSize = canvasSize
    this.containerSize = null
    this.scaleFactor = null

    this.moveEventsQueue = []
    this.cursorEventsQueue = []
    this.lineMileageCounter = new LineMileageCounter()
    
    this.isMultiLayerOperation = false

    this.prevTool = null
    this.toolbar = null

    // brush pointer
    this.brushPointerContainer = document.createElement('div')
    this.brushPointerContainer.className = 'brush-pointer'
    this.brushPointerContainer.style.position = 'absolute'
    this.brushPointerContainer.style.pointerEvents = 'none'
    document.body.appendChild(this.brushPointerContainer)

    // container
    this.containerEl = document.createElement('div')
    this.containerEl.classList.add('container')

    // sketchpane
    this.sketchPane = new SketchPane()
    this.sketchPane.on('ondown', this.onSketchPaneDown.bind(this))
    this.sketchPane.on('onbeforeup', this.onSketchPaneBeforeUp.bind(this))
    this.sketchPane.on('onup', this.onSketchPaneOnUp.bind(this))
    this.sketchPane.setCanvasSize(...this.canvasSize)
    this.sketchPaneDOMElement = this.sketchPane.getDOMElement()

    this.sketchPane.addLayer(0) // reference
    this.sketchPane.fillLayer('#fff')
    this.sketchPane.addLayer(1) // main
    this.sketchPane.addLayer(2) // onion skin
    this.sketchPane.addLayer(3) // notes
    this.sketchPane.addLayer(4) // guides
    this.sketchPane.addLayer(5) // composite
    this.sketchPane.selectLayer(1)

    this.sketchPane.setToolStabilizeLevel(10)
    this.sketchPane.setToolStabilizeWeight(0.2)

    this.el.addEventListener('pointerdown', this.canvasPointerDown)

    this.sketchPaneDOMElement.addEventListener('pointerover', this.canvasPointerOver)
    this.sketchPaneDOMElement.addEventListener('pointerout', this.canvasPointerOut)
    window.addEventListener('keydown', this.onKeyDown)
    window.addEventListener('keyup', this.onKeyUp)

    // measure and update cached size data
    this.updateContainerSize()

    // add container to element
    this.el.appendChild(this.containerEl)
    // add SketchPane to container
    this.containerEl.appendChild(this.sketchPaneDOMElement)

    // adjust sizes
    this.renderContainerSize()

    this.onFrame = this.onFrame.bind(this)
    requestAnimationFrame(this.onFrame)
  }

  // store snapshot on pointerdown?
  // eraser : yes
  // brushes: no
  onSketchPaneDown () {
    if (this.sketchPane.paintingKnockout) {
      if (this.isMultiLayerOperation) {
        this.emit('addToUndoStack', this.visibleLayersIndices)
      } else {
        this.emit('addToUndoStack')
      }
    }
  }

  // store snapshot before pointer up?
  // eraser : no
  // brushes: yes
  onSketchPaneBeforeUp () {
    if (!this.sketchPane.paintingKnockout) {
      this.emit('addToUndoStack')
    }
  }

  onSketchPaneOnUp (...args) {
    // quick erase : off
    this.unsetQuickErase()

    this.emit('onup', ...args)

    // store snapshot on up?
    // eraser : yes
    // brushes: yes
    if (this.isMultiLayerOperation) {
      // trigger a save to any layer possibly changed by the operation
      this.emit('markDirty', this.visibleLayersIndices)
      this.isMultiLayerOperation = false
    } else {
      this.emit('markDirty', [this.sketchPane.getCurrentLayerIndex()])
    }
  }

  onKeyDown (e) {
    this.setQuickEraseIfRequested()
  }

  onKeyUp (e) {
    if (!this.getIsDrawingOrStabilizing()) {
      this.unsetQuickErase()
    }
  }

  canvasPointerDown (event) {
    this.strategy.canvasPointerDown(event)
  }

  canvasPointerMove (e) {
    let pointerPosition = this.getRelativePosition(e.clientX, e.clientY)

    this.moveEventsQueue.push({
      clientX: e.clientX,
      clientY: e.clientY,

      x: pointerPosition.x,
      y: pointerPosition.y,
      pointerType: e.pointerType,
      pressure: e.pressure
    })
  }

  canvasPointerUp (e) {
    this.strategy.canvasPointerUp(event)
  }

  canvasCursorMove (event) {
    this.cursorEventsQueue.push({ clientX: event.clientX, clientY: event.clientY })
  }

  canvasPointerOver () {
    this.sketchPaneDOMElement.addEventListener('pointermove', this.canvasCursorMove)
    this.brushPointerContainer.style.display = 'block'
  }

  canvasPointerOut () {
    this.sketchPaneDOMElement.removeEventListener('pointermove', this.canvasCursorMove)
    this.brushPointerContainer.style.display = 'none'
  }

  onFrame (timestep) {
    this.renderEvents()
    requestAnimationFrame(this.onFrame)
  }

  renderEvents () {
    let lastCursorEvent,
        moveEvent

    // render the cursor
    if (this.cursorEventsQueue.length) {
      lastCursorEvent = this.cursorEventsQueue.pop()

      // update the position of the cursor
      this.brushPointerContainer.style.transform = 'translate(' + lastCursorEvent.clientX + 'px, ' + lastCursorEvent.clientY + 'px)'

      this.cursorEventsQueue = []
    }

    // render movements
    if (this.moveEventsQueue.length) {
      while (this.moveEventsQueue.length) {
        moveEvent = this.moveEventsQueue.shift()
        this.strategy.renderMoveEvent(moveEvent)
        this.lineMileageCounter.add({ x: moveEvent.y, y: moveEvent.y })
      }

      // report only the most recent event back to the app
      this.emit('pointermove', moveEvent.x, moveEvent.y, moveEvent.pointerType === "pen" ? moveEvent.pressure : 1, moveEvent.pointerType)
    }
  }

  setQuickEraseIfRequested () {
    if (keytracker('<alt>')) {
      // don't switch if we're already on an eraser
      if (this.toolbar.getBrushOptions().kind !== 'eraser') {
        this.toolbar.setIsQuickErasing(true)
        this.prevTool = this.toolbar.getBrushOptions()
        this.setBrushTool('eraser', this.toolbar.getBrushOptions('eraser'))
      }
    }
  }

  unsetQuickErase () {
    if (this.toolbar.getIsQuickErasing()) {
      this.toolbar.setIsQuickErasing(false)
      this.setBrushTool(this.prevTool.kind, this.prevTool)
      this.prevTool = null
    }
  }

  startMultiLayerOperation () {
    if (this.isMultiLayerOperation) return

    this.isMultiLayerOperation = true

    let compositeContext = this.sketchPane.getLayerContext(this.compositeIndex)

    this.sketchPane.clearLayer(this.compositeIndex)

    // draw composite from layers
    for (let index of this.visibleLayersIndices) {
      let canvas = this.sketchPane.getLayerCanvas(index)
      compositeContext.drawImage(canvas, 0, 0)
    }

    // select that layer
    this.sketchPane.selectLayer(this.compositeIndex)

    // listen to beforeup
    this.sketchPane.on('onbeforeup', this.stopMultiLayerOperation)
  }

  // TODO indices instead of names
  setCompositeLayerVisibility (value) {
    // solo the composite layer
    for (let index of this.visibleLayersIndices) {
      this.sketchPane.setLayerVisible(!value, index)
    }
    this.sketchPane.setLayerVisible(value, this.compositeIndex)
  }

  stopMultiLayerOperation () {
    if (!this.isMultiLayerOperation) return

    for (let index of this.visibleLayersIndices) {
      this.strategy.applyMultiLayerOperationByLayerIndex(index)
    }

    // reset
    this.setCompositeLayerVisibility(false)

    this.sketchPane.removeListener('onbeforeup', this.stopMultiLayerOperation)
  }

  // given a clientX and clientY,
  //   calculate the equivalent point on the sketchPane
  //     considering position and scale of the sketchPane
  getRelativePosition (absoluteX, absoluteY) {
    let rect = this.boundingClientRect
    let rectOnCanvas = { x: absoluteX - rect.left, y: absoluteY - rect.top }

    let scaleFactorX = this.canvasSize[0] / rect.width
    let scaleFactorY = this.canvasSize[1] / rect.height

    return {
      x: rectOnCanvas.x * scaleFactorX,
      y: rectOnCanvas.y * scaleFactorY
    }
  }

  fit (frameSize, imageSize) {
    const frameAspectRatio = frameSize[0] / frameSize[1]
    const imageAspectRatio = imageSize[0] / imageSize[1]

    return (frameAspectRatio > imageAspectRatio)
      ? [imageSize[0] * frameSize[1] / imageSize[1], frameSize[1]]
      : [frameSize[0], imageSize[1] * frameSize[0] / imageSize[0]]
  }

  /**
   * Given the dimensions of the wrapper element (this.el),
   *   update the fixed size .container to fit, with padding applied
   *   update the containerSize, cached for use by the renderer
   *   update the scaleFactor, used by the pointer
   */
  updateContainerSize () {
    // this.sketchPaneDOMElement.style.display = 'none'
    
    let rect = this.el.getBoundingClientRect()
    let size = [rect.width - this.containerPadding, rect.height - this.containerPadding]

    this.containerSize = this.fit(size, this.canvasSize).map(Math.floor)
    this.scaleFactor = this.containerSize[1] / this.canvasSize[1] // based on height
  }

  // TODO should this container scaling be a SketchPane feature?
  /**
   * Given the cached dimensions representing the available area (this.containerSize)
   *   update the fixed size .container to fit, with padding applied
   */
  renderContainerSize () {
    // the container
    this.containerEl.style.width = this.containerSize[0] + 'px'
    this.containerEl.style.height = this.containerSize[1] + 'px'

    // the sketchpane
    this.sketchPaneDOMElement.style.width = this.containerSize[0] + 'px'
    this.sketchPaneDOMElement.style.height = this.containerSize[1] + 'px'

    // the painting canvas
    this.sketchPane.paintingCanvas.style.width = this.containerSize[0] + 'px'
    this.sketchPane.paintingCanvas.style.height = this.containerSize[1] + 'px'

    // the dirtyRectDisplay
    this.sketchPane.dirtyRectDisplay.style.width = this.containerSize[0] + 'px'
    this.sketchPane.dirtyRectDisplay.style.height = this.containerSize[1] + 'px'

    // each layer
    let layers = this.sketchPane.getLayers()
    for (let i = 0; i < layers.length; ++i) {
      let canvas = this.sketchPane.getLayerCanvas(i)
      canvas.style.width = this.containerSize[0] + 'px'
      canvas.style.height = this.containerSize[1] + 'px'
    }

    // cache the boundingClientRect
    this.boundingClientRect = this.sketchPaneDOMElement.getBoundingClientRect()
  }

  updatePointer () {
    let image = null
    let threshold = 0xff
    // TODO why are we creating a new pointer every time?
    let brushPointer = this.sketchPane.createBrushPointer(
      image, 
      Math.max(6, this.brush.getSize() * this.scaleFactor),
      this.brush.getAngle(),
      threshold,
      true)
    brushPointer.style.display = 'block'
    brushPointer.style.setProperty('margin-left', '-' + (brushPointer.width * 0.5) + 'px')
    brushPointer.style.setProperty('margin-top', '-' + (brushPointer.height * 0.5) + 'px')

    this.brushPointerContainer.innerHTML = ''
    this.brushPointerContainer.appendChild(brushPointer)
  }

  resize () {
    this.updateContainerSize()
    this.renderContainerSize()

    if (this.brush) {
      this.updatePointer()
    }
  }

  //
  //
  // public
  //

  /**
   * clearLayers
   *
   * Clears all layers by default
   *
   */
  clearLayers (layerIndices) {
    if (!layerIndices) layerIndices = this.visibleLayersIndices
    this.emit('addToUndoStack', layerIndices)
    for (let index of layerIndices) {
      this.sketchPane.clearLayer(index)
    }
    this.emit('markDirty', layerIndices)
  }

  fillLayer (fillColor) {
    this.emit('addToUndoStack')
    this.sketchPane.fillLayer(fillColor, this.sketchPane.getCurrentLayerIndex())
    this.emit('markDirty', [this.sketchPane.getCurrentLayerIndex()])
  }

  flipLayers () {
    this.emit('addToUndoStack')
    // HACK operates on all layers
    for (var i = 0; i < this.sketchPane.layers.length; ++i) {
      this.sketchPane.flipLayer(i)
    }
    this.emit('markDirty', this.visibleLayersIndices)
  }
  setBrushTool (kind, options) {
    if (this.getIsDrawingOrStabilizing()) {
      return false
    }

    if (kind === 'eraser') {
      this.sketchPane.setPaintingKnockout(true)
    } else {
      this.sketchPane.setPaintingKnockout(false)
    }

    this.brush = new Brush()
    this.brush.setSize(options.size)
    this.brush.setColor(options.color.toCSS())
    this.brush.setSpacing(options.spacing)
    this.brush.setFlow(options.flow)
    this.brush.setHardness(options.hardness)

    if (!this.toolbar.getIsQuickErasing()) {
      let selectedLayerIndex
      switch (kind) {
        case 'light-pencil':
          selectedLayerIndex = 0 // HACK hardcoded
          break
        case 'note-pen':
          selectedLayerIndex = 3 // HACK hardcoded
          break
        default:
          selectedLayerIndex = 1 // HACK hardcoded
          break
      }
      this.sketchPane.selectLayer(selectedLayerIndex)

      // fat eraser
      if (kind === 'eraser') {
        this.setCompositeLayerVisibility(false)
        this.startMultiLayerOperation()
      } else {
        this.stopMultiLayerOperation() // force stop, in case we didn't get `onbeforeup` event
        this.isMultiLayerOperation = false // ensure we reset the var
      }
    }

    this.sketchPane.setPaintingOpacity(options.opacity)
    this.sketchPane.setTool(this.brush)

    this.updatePointer()
  }

  setBrushSize (size) {
    this.brush.setSize(size)
    this.sketchPane.setTool(this.brush)
    this.updatePointer()
  }

  setBrushColor (color) {
    this.brush.setColor(color.toCSS())
    this.sketchPane.setTool(this.brush)
    this.updatePointer()
  }

  // HACK copied from toolbar
  cloneOptions (opt) {
    return {
      kind: opt.kind,
      size: opt.size,
      spacing: opt.spacing,
      flow: opt.flow,
      hardness: opt.hardness,
      opacity: opt.opacity,
      color: opt.color.clone(),
      palette: opt.palette.map(color => color.clone())
    }
  }

  // FIXME DEPRECATED remove references in main-window if possible, use indices instead
  getLayerCanvasByName (name) {
    // HACK hardcoded
    const layerIndexByName = ['reference', 'main', 'onion', 'notes', 'guides', 'composite']
    return this.sketchPane.getLayerCanvas(layerIndexByName.indexOf(name))
  }

  getSnapshotAsCanvas (index) {
    const el = this.sketchPane.createLayerThumbnail(index)
    el.id = Math.floor(Math.random()*16777215).toString(16) // for debugging
    return el
  }
  
  getIsDrawingOrStabilizing () {
    return this.sketchPane.isDrawing || this.sketchPane.isStabilizing
  }

  moveContents () {
    // TODO dispose of prior strategy?
    this.strategy = new MovingStrategy(this)
  }
  scaleContents () {
    console.warn('Scale Contents Not Implemented')
  }
  cancelTransform () {
    this.strategy = new DrawingStrategy(this)
  }  
}

class DrawingStrategy {
  constructor (container) {
    this.container = container
  }

  canvasPointerDown (e) {
    // prevent overlapping calls
    if (this.container.getIsDrawingOrStabilizing()) return

    // quick erase : on
    this.container.setQuickEraseIfRequested()

    if (!this.container.toolbar.getIsQuickErasing() && this.container.sketchPane.getPaintingKnockout()) {
      this.container.startMultiLayerOperation()
      this.container.setCompositeLayerVisibility(true)
    }

    let pointerPosition = this.container.getRelativePosition(e.clientX, e.clientY)
    this.container.lineMileageCounter.reset()
    this.container.sketchPane.down(pointerPosition.x, pointerPosition.y, e.pointerType === "pen" ? e.pressure : 1)
    document.addEventListener('pointermove', this.container.canvasPointerMove)
    document.addEventListener('pointerup', this.container.canvasPointerUp)
    this.container.emit('pointerdown', pointerPosition.x, pointerPosition.y, e.pointerType === "pen" ? e.pressure : 1, e.pointerType)    
  }

  canvasPointerUp (e) {
    // force render remaining move events early, before frame loop
    this.container.renderEvents()
    // clear both event queues
    this.container.moveEventsQueue = []
    this.container.cursorEventsQueue = []

    let pointerPosition = this.container.getRelativePosition(e.clientX, e.clientY)
    this.container.sketchPane.up(pointerPosition.x, pointerPosition.y, e.pointerType === "pen" ? e.pressure : 1)
    this.container.emit('lineMileage', this.container.lineMileageCounter.get())
    document.removeEventListener('pointermove', this.container.canvasPointerMove)
    document.removeEventListener('pointerup', this.container.canvasPointerUp)
  }
  
  renderMoveEvent (moveEvent) {
    this.container.sketchPane.move(moveEvent.x, moveEvent.y, moveEvent.pointerType === "pen" ? moveEvent.pressure : 1)    
  }

  applyMultiLayerOperationByLayerIndex (index) {
    // apply result of erase bitmap to layer
    // code from SketchPane#drawPaintingCanvas
    let context = this.container.sketchPane.getLayerContext(index)
    let w = this.container.sketchPane.size.width
    let h = this.container.sketchPane.size.height
    context.save()
    context.globalAlpha = 1

    // paint the erase bitmap onto the given layer
    context.globalCompositeOperation = 'destination-out'
    context.drawImage(this.container.sketchPane.paintingCanvas, 0, 0, w, h)

    context.restore()
  }
}

class MovingStrategy {
  constructor (container) {
    this.container = container
    this.startAt = null
    this.pos = null
  }

  canvasPointerDown (e) {
    // prevent overlapping calls
    if (this.container.getIsDrawingOrStabilizing()) return

    let pointerPosition = this.container.getRelativePosition(e.clientX, e.clientY)
    this.startAt = [pointerPosition.x, pointerPosition.y]
    this.pos = [0, 0]
    this.container.lineMileageCounter.reset()
    this.container.emit('addToUndoStack', [0, 1, 3]) // HACK hardcoded

    this.container.startMultiLayerOperation()
    this.container.setCompositeLayerVisibility(true)

    // NOTE can fake an initial move event using this:
    // this.container.canvasPointerMove(e)

    document.addEventListener('pointermove', this.container.canvasPointerMove)
    document.addEventListener('pointerup', this.container.canvasPointerUp)

    // NOTE can trigger sound events using this:
    // this.container.emit('pointerdown', pointerPosition.x, pointerPosition.y, e.pointerType === "pen" ? e.pressure : 1, e.pointerType)
  }

  canvasPointerUp (e) {
    // force render remaining move events early, before frame loop
    this.container.renderEvents()
    // clear both event queues
    this.container.moveEventsQueue = []
    this.container.cursorEventsQueue = []

    // reset the painting layer
    let size = this.container.sketchPane.getCanvasSize()
    let paintingContext = this.container.sketchPane.paintingCanvas.getContext('2d')
    paintingContext.clearRect(0, 0, size.width, size.height)

    // let pointerPosition = this.container.getRelativePosition(e.clientX, e.clientY)
    this.container.stopMultiLayerOperation()
    this.startAt = null
    this.pos = null

    this.container.emit('markDirty', [0, 1, 3]) // HACK hardcoded
    this.container.isMultiLayerOperation = false

    document.removeEventListener('pointermove', this.container.canvasPointerMove)
    document.removeEventListener('pointerup', this.container.canvasPointerUp)
  }
  
  renderMoveEvent (moveEvent) {
    // move the composite layer
    let compositeContext = this.container.sketchPane.getLayerContext(this.container.compositeIndex)
    let paintingContext = this.container.sketchPane.paintingCanvas.getContext('2d')

    let w = this.container.sketchPane.size.width
    let h = this.container.sketchPane.size.height

    this.pos = [
      moveEvent.x - this.startAt[0],
      moveEvent.y - this.startAt[1]
    ].map(Math.floor)

    // re-draw to the painting layer
    paintingContext.clearRect(0, 0, w, h)
    paintingContext.drawImage(compositeContext.canvas, this.pos[0], this.pos[1])
  }

  applyMultiLayerOperationByLayerIndex (index) {
    if (!this.pos) return

    let context = this.container.sketchPane.getLayerContext(index)
    let w = this.container.sketchPane.size.width
    let h = this.container.sketchPane.size.height

    let storedCanvas = document.createElement('canvas')
    let storedContext = storedCanvas.getContext('2d')
    storedCanvas.width = context.canvas.width
    storedCanvas.height = context.canvas.height
    storedContext.drawImage(context.canvas, 0, 0)

    context.save()
    context.globalAlpha = 1

    context.clearRect(0, 0, w, h)
    context.drawImage(storedCanvas, this.pos[0], this.pos[1])

    context.restore()
  }
}

module.exports = StoryboarderSketchPane
