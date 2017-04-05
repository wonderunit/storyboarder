/*
- Manages the SketchPane
- Relays SketchPane events
- Runs operations on SketchPane layer
  - Duplicate
  - Delete

- Can load an image for a layer?

- Manages: 
  - Guides/Grid

- Doesn't manage:
  - Captions
*/
const EventEmitter = require('events').EventEmitter

const SketchPane = require('./sketch-pane')
const Brush = require('./sketch-pane/brush')

class StoryboarderSketchPane extends EventEmitter {
  constructor (el, canvasSize) {
    super()

    this.canvasPointerUp = this.canvasPointerUp.bind(this)
    this.canvasPointerDown = this.canvasPointerDown.bind(this)
    this.canvasPointerMove = this.canvasPointerMove.bind(this)
    this.canvasPointerOver = this.canvasPointerOver.bind(this)
    this.canvasPointerOut = this.canvasPointerOut.bind(this)
    this.canvasCursorMove = this.canvasCursorMove.bind(this)

    this.el = el
    this.canvasSize = canvasSize

    this.containerEl = document.createElement('div')
    this.containerEl.classList.add('container')

    // sketchpane
    this.sketchPane = new SketchPane()
    this.sketchPane.setCanvasSize(...this.canvasSize)

    this.sketchPane.addLayer(0) // reference
    this.sketchPane.fillLayer('#fff')
    this.sketchPane.addLayer(1) // painting
    this.sketchPane.addLayer(2) // onion skin
    this.sketchPane.addLayer(3) // notes
    this.sketchPane.addLayer(4) // guides
    this.sketchPane.selectLayer(1)

    this.sketchPane.setToolStabilizeLevel(10)
    this.sketchPane.setToolStabilizeWeight(0.2)

    this.sketchPaneDOMElement = this.sketchPane.getDOMElement()
    this.sketchPaneDOMElement.addEventListener('pointerdown', this.canvasPointerDown)
    this.sketchPaneDOMElement.addEventListener('pointerover', this.canvasPointerOver)
    this.sketchPaneDOMElement.addEventListener('pointerout', this.canvasPointerOut)

    this.el.appendChild(this.containerEl)
    this.containerEl.appendChild(this.sketchPaneDOMElement)

    this.resize()

    // brush pointer
    this.brushPointerContainer = document.createElement('div')
    this.brushPointerContainer.className = 'brush-pointer'
    this.brushPointerContainer.style.position = 'absolute'
    this.brushPointerContainer.style.pointerEvents = 'none'

    this.setBrushTool(null)

    this.sketchPane.on('onup', () => this.emit('markDirty'))
  }

  canvasPointerDown (e) {
    let pointerPosition = this.getRelativePosition(e.clientX, e.clientY)
    // if (pointerEventsNone)
    //     canvasArea.style.setProperty('cursor', 'none');
    if (e.shiftKey == true) {
      this.sketchPane.setPaintingKnockout(true)
    }
    //
    this.sketchPane.down(pointerPosition.x, pointerPosition.y, e.pointerType === "pen" ? e.pressure : 1)
    document.addEventListener('pointermove', this.canvasPointerMove)
    document.addEventListener('pointerup', this.canvasPointerUp)
  }

  canvasPointerMove (e) {
    let pointerPosition = this.getRelativePosition(e.clientX, e.clientY)
    this.sketchPane.move(pointerPosition.x, pointerPosition.y, e.pointerType === "pen" ? e.pressure : 1)
  }

  canvasPointerUp (e) {
    let pointerPosition = this.getRelativePosition(e.clientX, e.clientY)
    // if (pointerEventsNone)
    //     canvasArea.style.setProperty('cursor', 'crosshair')
    this.sketchPane.up(pointerPosition.x, pointerPosition.y, e.pointerType === "pen" ? e.pressure : 1)
    if (e.shiftKey == true) {
      setTimeout(() => this.sketchPane.setPaintingKnockout(false), 30)
    }
    //     setTimeout(function() {croquis.setPaintingKnockout(selectEraserCheckbox.checked)}, 30);//timeout should be longer than 20 (knockoutTickInterval in Croquis)
    document.removeEventListener('pointermove', this.canvasPointerMove)
    document.removeEventListener('pointerup', this.canvasPointerUp)
  }

  canvasCursorMove (e) {
    let x = e.clientX + window.pageXOffset
    let y = e.clientY + window.pageYOffset
    this.brushPointerContainer.style.setProperty('left', x + 'px')
    this.brushPointerContainer.style.setProperty('top', y + 'px')
  }

  canvasPointerOver () {
    this.sketchPaneDOMElement.addEventListener('pointermove', this.canvasCursorMove)
    document.body.appendChild(this.brushPointerContainer)
  }

  canvasPointerOut () {
    this.sketchPaneDOMElement.removeEventListener('pointermove', this.canvasCursorMove)

    if (this.brushPointerContainer.parentElement) {
      this.brushPointerContainer.parentElement.removeChild(this.brushPointerContainer)
    }
  }

  updatePointer () {
    let image = null
    let threshold = 0xff
    // TODO why are we creating a new pointer every time?
    let brushPointer = this.sketchPane.createBrushPointer(
      image, 
      this.brush.getSize(), 
      this.brush.getAngle(),
      threshold,
      true)
    brushPointer.style.display = 'block'
    brushPointer.style.setProperty('margin-left', '-' + (brushPointer.width * 0.5) + 'px')
    brushPointer.style.setProperty('margin-top', '-' + (brushPointer.height * 0.5) + 'px')
    this.brushPointerContainer.innerHTML = ''
    this.brushPointerContainer.appendChild(brushPointer)
  }

  getRelativePosition (absoluteX, absoluteY) {
    // TODO memoize for performance?
    let rect = this.sketchPaneDOMElement.getBoundingClientRect()
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

  resize () {
    let padding = 100
    let rect = this.el.getBoundingClientRect()
    let size = this.fit([rect.width - padding, rect.height - padding], this.canvasSize)
    size = size.map(Math.floor)
    this.containerSize = size

    this.containerEl.style.width = size[0] + 'px'
    this.containerEl.style.height = size[1] + 'px'

    // TODO should this container scaling be a SketchPane feature?

    let sketchPaneDOMElement = this.sketchPane.getDOMElement()
    sketchPaneDOMElement.style.width = size[0] + 'px'
    sketchPaneDOMElement.style.height = size[1] + 'px'

    // this.sketchPane.size.width = width = Math.floor(width)
    // this.sketchPane.size.height = height = Math.floor(height)

    this.sketchPane.paintingCanvas.style.width = size[0] + 'px'
    this.sketchPane.paintingCanvas.style.height = size[1] + 'px'

    this.sketchPane.dirtyRectDisplay.style.width = size[0] + 'px'
    this.sketchPane.dirtyRectDisplay.style.height = size[1] + 'px'

    let layers = this.sketchPane.getLayers()
    for (let i = 0; i < layers.length; ++i) {
      let canvas = this.sketchPane.getLayerCanvas(i)
      canvas.style.width = size[0] + 'px'
      canvas.style.height = size[1] + 'px'
    }
  }

  //
  //
  // public
  //

  clearLayer () {
    this.sketchPane.clearLayer(this.sketchPane.getCurrentLayerIndex())
    this.emit('markDirty')
  }

  fillLayer (fillColor) {
    this.sketchPane.fillLayer(fillColor, this.sketchPane.getCurrentLayerIndex())
    this.emit('markDirty')
  }

  setBrushTool (kind) {
    if (kind === 'eraser') {
      // TODO set size?
      this.sketchPane.setPaintingKnockout(true)
      this.updatePointer()
      return
    } else {
      this.sketchPane.setPaintingKnockout(false)
    }

    this.brush = new Brush()

    switch (kind) {
      case 'brush':
        this.brush.setSize(100)
        this.brush.setColor('#ccf')
        this.brush.setSpacing(0.02)
        this.brush.setFlow(0.7)
        this.brush.setHardness(0)
        this.sketchPane.setPaintingOpacity(0.2)
        break

      case 'note-pen':
        this.brush.setSize(10)
        this.brush.setColor('#f00')
        this.brush.setSpacing(0.02)
        this.brush.setFlow(0.9)
        this.brush.setHardness(0.9)
        this.sketchPane.setPaintingOpacity(0.8)
        break

      case 'light-pencil':
        this.brush.setSize(20)
        this.brush.setColor('#ccf')
        this.brush.setSpacing(0.12)
        this.brush.setFlow(0.4)
        this.brush.setHardness(0.8)
        this.sketchPane.setPaintingOpacity(0.3)
        break

      case 'pencil':
        this.brush.setSize(7)
        this.brush.setColor('#000')
        this.brush.setSpacing(.25)
        this.brush.setFlow(0.4)
        this.brush.setHardness(0.5)
        this.sketchPane.setPaintingOpacity(0.4)
        break

      // pen
      default:
        this.brush.setSize(20)
        this.brush.setColor('#000')
        this.brush.setSpacing(0.02)
        this.brush.setFlow(1)
        this.brush.setHardness(0.7)
        this.sketchPane.setPaintingOpacity(0.9)
    }

    this.sketchPane.setTool(this.brush)
    this.updatePointer()
  }

  getLayerCanvasByName (name) {
    const names = ['reference', 'painting', 'onion', 'notes', 'guides']
    return this.sketchPane.getLayerCanvas(names.indexOf(name))
  }
}

module.exports = StoryboarderSketchPane
