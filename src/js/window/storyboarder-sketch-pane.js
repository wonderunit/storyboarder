const EventEmitter = require('events').EventEmitter

const { ipcRenderer, remote } = require('electron')

const fs = require('fs')
const path = require('path')

const SketchPane = require('alchemancy')

const Brush = require('../sketch-pane/brush')
const LineMileageCounter = require('./line-mileage-counter')

const { createIsCommandPressed } = require('../utils/keytracker')
const util = require('../utils')

const { LAYER_NAME_BY_INDEX } = require('../constants')

const observeStore = require('../shared/helpers/observeStore')

const sfx = require('../wonderunit-sound')

const prefsModule = require('electron').remote.require('./prefs')
// TODO
// TODO enableBrushCursor
// TODO
const enableBrushCursor = prefsModule.getPrefs('main')['enableBrushCursor']
const enableStabilizer = prefsModule.getPrefs('main')['enableStabilizer']

/**
 *  Wrap the SketchPane component with features Storyboarder needs
 *
 *  Adds a `div.container` to contain the SketchPane. Updated on resize to fit within workspace.
 *
 *  @param {HTMLElement} el reference to the container element, e.g. reference to div#storyboarder-sketch-pane
 *  @param {array} canvasSize array of [width, height]. width is always 900.
 */
class StoryboarderSketchPane extends EventEmitter {
  constructor (el, canvasSize, store) {
    super()
    this.el = el
    this.canvasSize = canvasSize
    this.store = store
  }

  async load () {
    this.isCommandPressed = createIsCommandPressed(this.store)

    // this.prevTimeStamp = 0
    // this.frameLengthArray = []

    // NOTE sets DrawingStrategy
    // this.cancelTransform()

    this.containerPadding = 100

    // HACK hardcoded
    this.visibleLayersIndices = [0, 1, 3] // reference, main, notes

    // this.compositeIndex = 5 // composite

    // this.canvasPointerUp = this.canvasPointerUp.bind(this)
    // this.canvasPointerDown = this.canvasPointerDown.bind(this)
    // this.canvasPointerMove = this.canvasPointerMove.bind(this)
    // this.canvasPointerOver = this.canvasPointerOver.bind(this)
    // this.canvasPointerOut = this.canvasPointerOut.bind(this)
    // this.canvasCursorMove = this.canvasCursorMove.bind(this)
    // this.stopMultiLayerOperation = this.stopMultiLayerOperation.bind(this)

    this.onKeyDown = this.onKeyDown.bind(this)
    this.onKeyUp = this.onKeyUp.bind(this)
    // this.onDblClick = this.onDblClick.bind(this)

    // this.containerSize = null
    // this.scaleFactor = null

    // this.isPointerDown = false
    // this.lastMoveEvent = null
    // this.lastCursorEvent = null

    this.lineMileageCounter = new LineMileageCounter()

    // this.isMultiLayerOperation = false
    // this.isEraseButtonActive = false

    // this.prevTool = null
    // this.toolbar = null

    // this.isLocked = false

    // container
    this.containerEl = document.createElement('div')
    this.containerEl.classList.add('container')

    // brush pointer
    // if (enableBrushCursor) {
    //   this.brushPointerContainer = document.createElement('div')
    //   this.brushPointerContainer.className = 'brush-pointer'
    //   this.brushPointerContainer.style.position = 'absolute'
    //   this.brushPointerContainer.style.pointerEvents = 'none'
    //   document.body.appendChild(this.brushPointerContainer)
    // }

    // setup and render (if necessary) pointer cursor
    // this.isCursorOnDrawingArea = false
    // this.cursorType = 'drawing'
    // the DOM query returns null unless we wait for the next tick.
    // process.nextTick(() => this.renderCursor())


    // sketchpane
    this.sketchPane = new SketchPane({
      imageWidth: this.canvasSize[0],
      imageHeight: this.canvasSize[1],
      backgroundColor: 0x333333
    })

    await this.sketchPane.loadBrushes({
      brushes: JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'data', 'brushes', 'brushes.json'))),
      brushImagePath: path.join(__dirname, '..', '..', 'data', 'brushes')
    })

    this.sketchPaneDOMElement = this.sketchPane.getDOMElement()
    this.resize()

    // measure and update cached size data
    // this.updateContainerSize()

    // adjust sizes
    // this.renderContainerSize()

    // this.sketchPane.on('onbeforeup', this.onSketchPaneBeforeUp.bind(this)) // MIGRATE
    // this.sketchPane.on('onup', this.onSketchPaneOnUp.bind(this)) // MIGRATE

    this.sketchPane.newLayer() // reference
    // this.sketchPane.fillLayer('#fff')
    this.sketchPane.newLayer() // main
    this.sketchPane.newLayer() // onion skin
    this.sketchPane.newLayer() // notes
    this.sketchPane.newLayer() // guides
    this.sketchPane.newLayer() // composite
    this.sketchPane.setCurrentLayerIndex(1)

    // TODO minimum update (e.g.: maybe just cursor size?)
    // sync sketchpane to state
    const syncSketchPaneState = toolbarState => {
      if (toolbarState.activeTool != null) {
        const tool = toolbarState.tools[toolbarState.activeTool]
        this.sketchPane.brush = this.sketchPane.brushes[tool.name]
        this.sketchPane.brushColor = tool.color
        this.sketchPane.brushSize = tool.size
        this.sketchPane.brushOpacity = tool.opacity

        // TODO move to a reducer?
        // if we're not erasing ...
        if (toolbarState.activeTool !== 'eraser') {
          // ... set the current layer based on the active tool
          switch (toolbarState.activeTool) {
            case 'light-pencil':
              this.sketchPane.setCurrentLayerIndex(0) // HACK hardcoded
              break
            case 'note-pen':
              this.sketchPane.setCurrentLayerIndex(3) // HACK hardcoded
              break
            default:
              this.sketchPane.setCurrentLayerIndex(1) // HACK hardcoded
              break
          }
        }

        if ((this.strategy && this.strategy.name) !== toolbarState.mode) {
          this.setStrategy(toolbarState.mode)
        }
      }

      // TODO update pointer?
    }

    // sync on change
    observeStore(
      this.store,
      state => state.toolbar,
      toolbarState => {
        // update the cursor any time any toolbar-related value changes
        syncSketchPaneState(toolbarState)
      },
      // sync now to init
      true
    )

    // TODO cleanup
    // let ro = new window.ResizeObserver(entries => {
    //   console.log('resize', entries[0].contentRect, this.containerEl)
    //   const { width, height } = entries[0].contentRect
    //   this.sketchPane.resize(width, height)
    // })
    // ro.observe(this.containerEl)
    window.addEventListener('resize', e => this.resize())

    this.sketchPane.onStrokeBefore = strokeState =>
      this.emit('addToUndoStack', strokeState.layerIndices)

    this.sketchPane.onStrokeAfter = strokeState =>
      this.emit('markDirty', strokeState.layerIndices)

    // Proxy
    this.sketchPane.setTool = () => { console.warn('SketchPane#setTool no impl') }
    this.sketchPane.getCanvasWidth = () => { return this.sketchPane.width }
    this.sketchPane.getCanvasHeight = () => { return this.sketchPane.height }


    // MIGRATE TODO REMOVE 
    // let stabilizeLevel = 0
    // if(enableStabilizer) {
    //   stabilizeLevel = 10
    // }
    // this.sketchPane.setToolStabilizeLevel(stabilizeLevel)
    // this.sketchPane.setToolStabilizeWeight(0.2)

    this.el.addEventListener('dblclick', this.onDblClick)

    // TODO
    // TODO
    // TODO
    // TODO
    // this.el.addEventListener('pointerdown', this.canvasPointerDown)
    // this.sketchPaneDOMElement.addEventListener('pointerover', this.canvasPointerOver)
    // this.sketchPaneDOMElement.addEventListener('pointerout', this.canvasPointerOut)

    window.addEventListener('keydown', this.onKeyDown)
    window.addEventListener('keyup', this.onKeyUp)

    // this.onFrame = this.onFrame.bind(this)
    // requestAnimationFrame(this.onFrame)

    this.strategies = {
      drawing: new DrawingStrategy(this),
      moving: new MovingStrategy(this)
    }

    this.store.dispatch({ type: 'TOOLBAR_MODE_SET', payload: 'drawing', meta: { scope: 'local' } })

    // add SketchPane to container
    this.containerEl.appendChild(this.sketchPaneDOMElement)

    // add container to element
    this.el.appendChild(this.containerEl)
  }

  // for compatibility with older sketchpane code
  getCanvasSize () {
    return { width: this.sketchPane.width, height: this.sketchPane.height }
  }

  setStrategy (strategy) {
    if (this.strategy) this.strategy.shutdown()

    this.strategy = this.strategies[strategy]
    this.strategy.startup()
  }

  // setStrategy (Strategy) {
  //   console.log('StoryboarderSketchPane#setStrategy')
  //   return
  //   if (this.strategy instanceof Strategy) return
  // 
  //   if (this.strategy instanceof LockedStrategy) {
  //     // can't unlock if locked
  //     if (this.isLocked) {
  //       return
  //     }
  //   }
  // 
  // 
  // 
  //   // HACK
  //   // force render remaining move events early, before frame loop
  //   this.renderEvents()
  //   // clear both event queues
  //   this.lastMoveEvent = null
  //   this.lastCursorEvent = null
  // 
  // 
  // 
  //   if (this.strategy) this.strategy.dispose()
  // 
  //   this.strategy = new Strategy(this)
  // }

  // TODO
  // TODO
  // TODO
  setIsLocked (shouldLock) {
    return
    // if (shouldLock) {
    //   this.isLocked = true
    //   this.setStrategy(LockedStrategy)
    // } else {
    //   this.isLocked = false
    // 
    //   // if it's currently locked
    //   if (this.strategy instanceof LockedStrategy) {
    //     // allow drawing
    //     this.setStrategy(DrawingStrategy)
    //   }
    // }
  }

  // TODO
  // TODO
  // TODO
  preventIfLocked () {
    return
    if (this.isLocked) {
      remote.dialog.showMessageBox({
        message: 'The current board is linked to a PSD and cannot be changed. To unlink, double-click the board art.',
      })
      return true
    } else {
      return false
    }
  }

  // TODO
  // TODO
  // TODO
  renderCursor () {
    return
    if (this.isCursorOnDrawingArea) {
      switch (this.cursorType) {
        case 'not-allowed':
          document.querySelector('#storyboarder-sketch-pane .container').style.cursor = 'not-allowed'
          if (this.brushPointerContainer) this.brushPointerContainer.style.visibility = 'hidden'
          break

        case 'move':
          document.querySelector('#storyboarder-sketch-pane .container').style.cursor = 'move'
          if (this.brushPointerContainer) this.brushPointerContainer.style.visibility = 'hidden'
          break

        case 'ew-resize':
          document.querySelector('#storyboarder-sketch-pane .container').style.cursor = 'ew-resize'
          if (this.brushPointerContainer) this.brushPointerContainer.style.visibility = 'hidden'
          break

        case 'drawing':
        default:
          if (this.brushPointerContainer) {
            document.querySelector('#storyboarder-sketch-pane .container').style.cursor = 'none'
            this.brushPointerContainer.style.visibility = 'visible'
          } else {
            document.querySelector('#storyboarder-sketch-pane .container').style.cursor = 'crosshair'
          }
          break
      }

    } else {
      document.querySelector('#storyboarder-sketch-pane .container').style.cursor = 'default'
      if (this.brushPointerContainer) this.brushPointerContainer.style.visibility = 'hidden'
    }
  }

  // store snapshot before pointer up?
  // eraser : no
  // brushes: yes
  // TODO
  // TODO
  // TODO
  onSketchPaneBeforeUp () {
    return
    if (!this.sketchPane.getIsErasing()) {
      this.emit('addToUndoStack')
    }
  }

  // TODO
  // TODO
  // TODO
  onSketchPaneOnUp (...args) {
    return
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
    if (this.isCommandPressed('drawing:scale-mode')) {
      // switch to scale strategy
    } else if (this.isCommandPressed('drawing:move-mode')) {
      // switch to move strategy
      this.store.dispatch({ type: 'TOOLBAR_MODE_SET', payload: 'moving', meta: { scope: 'local' } })
      sfx.playEffect('metal')
    }
  }

  onKeyUp (e) {
    if ( !(this.isCommandPressed('drawing:scale-mode') || this.isCommandPressed('drawing:move-mode')) ) {
      // switch to default strategy (drawing)
      this.store.dispatch({ type: 'TOOLBAR_MODE_SET', payload: 'drawing', meta: { scope: 'local' } })
      sfx.playEffect('metal')
    }
  }

  // canvasPointerDown (event) {
  //   this.strategy.canvasPointerDown(event)
  // }

  // canvasPointerMove (e) {
  //   let pointerPosition = this.getRelativePosition(e.clientX, e.clientY)
  // 
  //   this.lastMoveEvent = {
  //     clientX: e.clientX,
  //     clientY: e.clientY,
  // 
  //     x: pointerPosition.x,
  //     y: pointerPosition.y,
  //     pointerType: e.pointerType,
  //     pressure: e.pressure,
  //     shiftKey: e.shiftKey
  //   }
  // }

  // canvasPointerUp (e) {
  //   this.strategy.canvasPointerUp(event)


  // TODO
  // TODO
  // TODO
  // TODO
  // TODO analytics
  // TODO
  //   if (this.frameLengthArray.length > 20) {
  //     // get average frame duration
  //     let sum = this.frameLengthArray.reduce(function(a, b) { return a + b; })
  //     let avg = sum / this.frameLengthArray.length
  //     // get longest
  //     this.frameLengthArray.sort().pop()
  //     let max = this.frameLengthArray.reverse()[0]
  //     // send data
  //     // 1 in 10 chance to send
  //     if (Date.now() % 8 == 1) {
  //       ipcRenderer.send('analyticsTiming', 'Performance', 'averageframe', avg)
  //       ipcRenderer.send('analyticsTiming', 'Performance', 'maxframe', max)
  //     }
  //   }
  //   this.frameLengthArray = []
  // }

  // TODO
  // TODO
  // TODO
  // TODO
  // isCursorOnDrawingArea

  // canvasCursorMove (event) {
  //   this.lastCursorEvent = { clientX: event.clientX, clientY: event.clientY }
  // }
  // 
  // canvasPointerOver () {
  //   this.sketchPaneDOMElement.addEventListener('pointermove', this.canvasCursorMove)
  // 
  //   this.isCursorOnDrawingArea = true
  //   this.renderCursor()
  // }

  // canvasPointerOut () {
  //   this.sketchPaneDOMElement.removeEventListener('pointermove', this.canvasCursorMove)
  // 
  //   this.isCursorOnDrawingArea = false
  //   this.renderCursor()
  // }

  // TODO
  // TODO
  // TODO onDblClick, requestUnlock
  // TODO
  // onDblClick (event) {
  //   if (this.isLocked) {
  //     this.emit('requestUnlock')
  //   }
  // }

  // onFrame (timestep) {
  //   if (this.isPointerDown) {
  //     this.frameLengthArray.push(timestep - this.prevTimeStamp)
  //   }
  //   this.prevTimeStamp = timestep
  //   this.renderEvents()
  //   requestAnimationFrame(this.onFrame)
  // }

  // renderEvents () {
  //   let lastCursorEvent,
  //       moveEvent
  // 
  //   // render the cursor
  //   if (this.lastCursorEvent && this.brushPointerContainer && this.brushPointerContainer.style) {
  //     // update the position of the cursor
  //     this.brushPointerContainer.style.transform = 'translate(' + this.lastCursorEvent.clientX + 'px, ' + this.lastCursorEvent.clientY + 'px)'
  //     this.lastCursorEvent = null
  //   }
  // 
  //   // render movements
  //   if (this.lastMoveEvent) {
  //     this.strategy.renderMoveEvent(this.lastMoveEvent)
  //     this.lineMileageCounter.add({ x: this.lastMoveEvent.y, y: this.lastMoveEvent.y })
  // 
  //     // report only the most recent event back to the app
  //     this.emit('pointermove', this.lastMoveEvent.x, this.lastMoveEvent.y, this.lastMoveEvent.pointerType === "pen" ? this.lastMoveEvent.pressure : 1, this.lastMoveEvent.pointerType)
  //   }
  // }


  // unsetQuickErase () {
  //   if (this.toolbar.getIsQuickErasing()) {
  //     this.toolbar.setIsQuickErasing(false)
  //     if (this.prevTool) {
  //       this.setBrushTool(this.prevTool.kind, this.prevTool)
  //     }
  //     this.prevTool = null
  //   }
  // }

  // startMultiLayerOperation () {
  //   // if (this.isMultiLayerOperation) return
  //   this.isMultiLayerOperation = true
  // 
  //   this.strategy.startMultiLayerOperation()
  // 
  //   // listen to beforeup
  //   this.sketchPane.on('onbeforeup', this.stopMultiLayerOperation)
  // }

  // TODO indices instead of names
  // setCompositeLayerVisibility (value) {
  //   // solo the composite layer
  //   for (let index of this.visibleLayersIndices) {
  //     this.sketchPane.setLayerVisible(!value, index)
  //   }
  //   this.sketchPane.setLayerVisible(value, this.compositeIndex)
  // }
  // 
  // stopMultiLayerOperation () {
  //   if (!this.isMultiLayerOperation) return
  // 
  //   for (let index of this.visibleLayersIndices) {
  //     this.strategy.applyMultiLayerOperationByLayerIndex(index)
  //   }
  // 
  //   // reset
  //   this.setCompositeLayerVisibility(false)
  // 
  //   this.sketchPane.removeListener('onbeforeup', this.stopMultiLayerOperation)
  // }

  // draw composite from layers
  // drawComposite (layerIndices, destinationContext) {
  //   for (let index of layerIndices) {
  //     let canvas = this.sketchPane.getLayerCanvas(index)
  // 
  //     destinationContext.save()
  //     destinationContext.globalAlpha = this.getLayerOpacity(index)
  //     destinationContext.drawImage(canvas, 0, 0)
  //     destinationContext.restore()
  //   }
  //   return destinationContext
  // }

  // TODO
  // TODO
  // TODO mergeLayers
  // TODO
  // mergeLayers (layers, destination) {
  //   // make a unique, sorted array of dirty layers
  //   let dirtyLayers = [...new Set(layers.concat(destination))].sort(util.compareNumbers)
  //   // save an undo snapshot
  //   this.emit('addToUndoStack', dirtyLayers)
  // 
  //   // create a temporary canvas
  //   let composite = document.createElement('canvas')
  //   let size = this.sketchPane.getCanvasSize()
  //   composite.width = size.width
  //   composite.height = size.height
  //   let compositeContext = composite.getContext('2d')
  // 
  //   // draw layers, in order, to temporary canvas
  //   this.drawComposite(layers, compositeContext)
  // 
  //   // clear destination
  //   this.sketchPane.clearLayer(destination)
  // 
  //   // stamp composite onto main
  //   let destinationContext = this.sketchPane.getLayerContext(destination)
  //   destinationContext.drawImage(compositeContext.canvas, 0, 0)
  // 
  //   // clear the source layers
  //   for (let index of layers) {
  //     if (index !== destination) {
  //       this.sketchPane.clearLayer(index)
  //     }
  //   }
  // 
  //   // mark all layers dirty
  //   this.emit('markDirty', dirtyLayers)
  // }

  // // given a clientX and clientY,
  // //   calculate the equivalent point on the sketchPane
  // //     considering position and scale of the sketchPane
  // getRelativePosition (absoluteX, absoluteY) {
  //   let rect = this.boundingClientRect
  //   let rectOnCanvas = { x: absoluteX - rect.left, y: absoluteY - rect.top }
  // 
  //   let scaleFactorX = this.canvasSize[0] / rect.width
  //   let scaleFactorY = this.canvasSize[1] / rect.height
  // 
  //   return {
  //     x: rectOnCanvas.x * scaleFactorX,
  //     y: rectOnCanvas.y * scaleFactorY
  //   }
  // }
  // 
  // fit (frameSize, imageSize) {
  //   const frameAspectRatio = frameSize[0] / frameSize[1]
  //   const imageAspectRatio = imageSize[0] / imageSize[1]
  // 
  //   return (frameAspectRatio > imageAspectRatio)
  //     ? [imageSize[0] * frameSize[1] / imageSize[1], frameSize[1]]
  //     : [frameSize[0], imageSize[1] * frameSize[0] / imageSize[0]]
  // }

  /**
   * Given the dimensions of the wrapper element (this.el),
   *   update the fixed size .container to fit, with padding applied
   *   update the containerSize, cached for use by the renderer
   *   update the scaleFactor, used by the pointer
   */
  // updateContainerSize () {
  //   // this.sketchPaneDOMElement.style.display = 'none'
  // 
  //   let rect = this.el.getBoundingClientRect()
  //   let size = [rect.width - this.containerPadding, rect.height - this.containerPadding]
  // 
  //   this.containerSize = this.fit(size, this.canvasSize).map(Math.floor)
  //   this.scaleFactor = this.containerSize[1] / this.canvasSize[1] // based on height
  // }

  // TODO should this container scaling be a SketchPane feature?
  /**
   * Given the cached dimensions representing the available area (this.containerSize)
   *   update the fixed size .container to fit, with padding applied
   */
  // renderContainerSize () {
    // the container
    // this.containerEl.style.width = this.containerSize[0] + 'px'
    // this.containerEl.style.height = this.containerSize[1] + 'px'

    //
    // MIGRATE TODO
    //
    // // the sketchpane
    // this.sketchPaneDOMElement.style.width = this.containerSize[0] + 'px'
    // this.sketchPaneDOMElement.style.height = this.containerSize[1] + 'px'
    // 
    // // the painting canvas
    // this.sketchPane.paintingCanvas.style.width = this.containerSize[0] + 'px'
    // this.sketchPane.paintingCanvas.style.height = this.containerSize[1] + 'px'
    // 
    // // the dirtyRectDisplay
    // this.sketchPane.dirtyRectDisplay.style.width = this.containerSize[0] + 'px'
    // this.sketchPane.dirtyRectDisplay.style.height = this.containerSize[1] + 'px'
    // 
    // // each layer
    // let layers = this.sketchPane.getLayers()
    // for (let i = 0; i < layers.length; ++i) {
    //   let canvas = this.sketchPane.getLayerCanvas(i)
    //   canvas.style.width = this.containerSize[0] + 'px'
    //   canvas.style.height = this.containerSize[1] + 'px'
    // }

    // cache the boundingClientRect
    // this.boundingClientRect = this.sketchPaneDOMElement.getBoundingClientRect()
  // }

  // updatePointer () {
  //   return // MIGRATING
  // 
  // 
  // 
  //   if(!enableBrushCursor) {
  //     return
  //   }
  //   let image = null
  //   let threshold = 0xff
  //   // TODO why are we creating a new pointer every time?
  //   let brushPointerCanvas = this.sketchPane.createBrushPointer(
  //     image, 
  //     Math.max(6, this.brush.getSize() * this.scaleFactor),
  //     this.brush.getAngle(),
  //     threshold,
  //     true)
  // 
  //   let brushPointer = document.createElement('img')
  //   brushPointer.src = brushPointerCanvas.toDataURL('image/png')
  //   brushPointer.style.width = brushPointerCanvas.width
  //   brushPointer.style.height = brushPointerCanvas.height
  //   brushPointer.style.display = 'block'
  //   brushPointer.style.setProperty('margin-left', '-' + (brushPointerCanvas.width * 0.5) + 'px')
  //   brushPointer.style.setProperty('margin-top', '-' + (brushPointerCanvas.height * 0.5) + 'px')
  // 
  //   this.brushPointerContainer.innerHTML = ''
  // 
  //   this.brushPointerContainer.appendChild(brushPointer)
  // }

  resize () {
    // this.updateContainerSize()
    // this.renderContainerSize()

    const { width, height } = this.containerEl.getBoundingClientRect()
    this.sketchPane.resize(width - this.containerPadding, height - this.containerPadding)

    // if (this.brush) {
    //   this.updatePointer()
    // }
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

  isEmpty () {
    for (let index of this.visibleLayersIndices) {
      if (!this.sketchPane.isLayerEmpty(index)) {
        return false
      }
    }
    return true
  }

  // TODO do we need this?
  replaceLayer (index, image) {
    this.emit('addToUndoStack')
    this.sketchPane.replaceLayer(index, image)
    this.emit('markDirty', [index])
  }

  flipLayers (vertical) {
    this.emit('addToUndoStack', this.visibleLayersIndices)
    this.sketchPane.flipLayers(vertical)
    this.emit('markDirty', this.visibleLayersIndices)
  }
  // setBrushTool (kind, options) {
  //   return
  // 
  //   if (this.getIsDrawingOrStabilizing()) {
  //     return false
  //   }
  // 
  //   if (kind === 'eraser') {
  //     this.sketchPane.setIsErasing(true)
  //   } else {
  //     this.sketchPane.setIsErasing(false)
  //   }
  // 
  //   this.brush = new Brush()
  //   this.brush.setSize(options.size)
  //   this.brush.setColor(options.color.toCSS())
  //   this.brush.setSpacing(options.spacing)
  //   this.brush.setFlow(options.flow)
  //   this.brush.setHardness(options.hardness)
  // 
  //   // if (!this.toolbar.getIsQuickErasing()) {
  //   //   let selectedLayerIndex
  //   //   switch (kind) {
  //   //     case 'light-pencil':
  //   //       selectedLayerIndex = 0 // HACK hardcoded
  //   //       break
  //   //     case 'note-pen':
  //   //       selectedLayerIndex = 3 // HACK hardcoded
  //   //       break
  //   //     default:
  //   //       selectedLayerIndex = 1 // HACK hardcoded
  //   //       break
  //   //   }
  //   //   this.sketchPane.selectLayer(selectedLayerIndex)
  //   // 
  //   //   // fat eraser
  //   //   if (kind === 'eraser') {
  //   //     this.setCompositeLayerVisibility(false)
  //   //     this.startMultiLayerOperation()
  //   //   } else {
  //   //     this.stopMultiLayerOperation() // force stop, in case we didn't get `onbeforeup` event
  //   //     this.isMultiLayerOperation = false // ensure we reset the var
  //   //   }
  //   // }
  // 
  //   this.sketchPane.setTool(this.brush)
  // 
  //   // this.updatePointer()
  // }

  // setBrushSize (size) {
  //   // this.brush.setSize(size)
  //   // this.sketchPane.setTool(this.brush)
  //   // this.updatePointer()
  //   // this.sketchPane.brushSize = size
  //   this.store.dispatch({ type: 'TOOLBAR_TOOL_SET', payload: { size } })
  // }

  // setBrushColor (color) {
  //   // this.brush.setColor(color.toCSS())
  //   // this.sketchPane.setTool(this.brush)
  //   // this.updatePointer()
  // 
  //   // convert to number
  //   color = utils.colorToNumber(color)
  // 
  //   this.store.dispatch({ type: 'TOOLBAR_TOOL_SET', payload: { color }, meta: { scope: 'local' } })
  // }

  // HACK copied from toolbar
  // cloneOptions (opt) {
  //   return {
  //     kind: opt.kind,
  //     size: opt.size,
  //     spacing: opt.spacing,
  //     flow: opt.flow,
  //     hardness: opt.hardness,
  //     opacity: opt.opacity,
  //     color: opt.color.clone(),
  //     palette: opt.palette.map(color => color.clone())
  //   }
  // }

  // createContext () {
  //   let size = [
  //     this.sketchPane.width,
  //     this.sketchPane.height
  //   ]
  //   let canvas = document.createElement('canvas')
  //   let context = canvas.getContext('2d')
  //   canvas.width = size[0]
  //   canvas.height = size[1]
  //   return context
  // }

  // FIXME DEPRECATED remove references in main-window if possible, use indices instead
  // getLayerCanvasByName (name) {
  //   return this.sketchPane.getLayerCanvas(LAYER_NAME_BY_INDEX.indexOf(name))
  // }

  // getSnapshotAsCanvas (index) {
  //   const el = this.sketchPane.getLayerCanvas(index)
  //   el.id = Math.floor(Math.random() * 16777215).toString(16) // for debugging
  //   return el
  // }

  // TODO rename to isDrawing, find/replace instances
  getIsDrawingOrStabilizing () {
    return this.sketchPane.isDrawing()
    // return this.sketchPane.isDrawing || this.sketchPane.isStabilizing
  }

  // moveContents () {
    // this.setStrategy(MovingStrategy)
  // }
  // scaleContents () {
    // this.setStrategy(ScalingStrategy)
  // }
  // cancelTransform () {
  //   if (this.strategy instanceof DrawingStrategy) return
  // 
  //   this.setStrategy(DrawingStrategy)
  // 
  //   if (this.toolbar) {
  //     this.setBrushTool(this.toolbar.getBrushOptions().kind, this.toolbar.getBrushOptions())
  //   }
  // }

  //
  //
  // compatibility methods
  //
  getLayerCanvas (index) {
    return this.sketchPane.getLayerCanvas(index)
  }
  clearLayer (index) {
    this.sketchPane.clearLayer(index)
  }
  getLayerOpacity (index) {
    return this.sketchPane.getLayerOpacity(index)
  }
  setLayerOpacity (index, opacity) {
    return this.sketchPane.setLayerOpacity(index, opacity)
  }
  exportLayer (index, format = 'base64') {
    return this.sketchPane.exportLayer(index, format)
  }

  markLayersDirty (indices) {
    this.sketchPane.layers.markDirty(indices)
  }
  getLayerDirty (index) {
    return this.sketchPane.getLayerDirty(index)
  }
  clearLayerDirty (index) {
    this.sketchPane.clearLayerDirty(index)
  }
}

class DrawingStrategy {
  constructor (context) {
    this.context = context
    this.name = 'drawing'

    this._onPointerDown = this._onPointerDown.bind(this)
    this._onPointerMove = this._onPointerMove.bind(this)
    this._onPointerUp = this._onPointerUp.bind(this)
    this._onKeyUp = this._onKeyUp.bind(this)
  }

  startup () {
    window.addEventListener('pointerdown', this._onPointerDown)
    window.addEventListener('pointermove', this._onPointerMove)
    window.addEventListener('pointerup', this._onPointerUp)
    window.addEventListener('keyup', this._onKeyUp)
  }

  shutdown () {
    if (this.context.sketchPane.isDrawing()) {
      this.context.sketchPane.stopDrawing()
    }

    window.removeEventListener('pointerdown', this._onPointerDown)
    window.removeEventListener('pointermove', this._onPointerMove)
    window.removeEventListener('pointerup', this._onPointerUp)
    window.removeEventListener('keyup', this._onKeyUp)

    this.context.sketchPane.app.view.style.cursor = 'auto'
  }

  _onPointerDown (e) {
    // TODO avoid false positive clicks :/
    // TODO could store multiErase status / erase layer array in a reducer?

    // configure the tool for drawing

    // stroke options
    // via https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events#Determining_button_states
    // is the user requesting to erase?
    let options = {}

    let toolbarState = this.context.store.getState().toolbar

    if (!toolbarState.prevTool &&
        toolbarState.activeTool === 'eraser') {
      // regular erase
      options.erase = [0, 1, 3]
    } else {
      options = (e.buttons === 32 || this.context.isCommandPressed('drawing:quick-erase-modifier'))
        // is the shift key down?
        ? e.shiftKey
          // ... then, erase multiple layers
          ? { erase: [0, 1, 3] } // HACK hardcoded
          // ... otherwise, only erase current layer
          : { erase: [this.context.sketchPane.getCurrentLayerIndex()] }
        // not erasing
        : {}

      if (options.erase) {
        // switch to quick-erase mode
        this.context.store.dispatch({ type: 'TOOLBAR_TOOL_QUICK_PUSH', payload: 'eraser', meta: { scope: 'local' } })
      }
    }

    // sync sketchPane to the current toolbar state
    // syncSketchPaneState(this.store.getState().toolbar)

    this.context.sketchPane.down(e, options)

    // just triggers layer opacity check
    this.context.emit('requestPointerDown')
  }

  _onPointerMove (e) {
    this.context.sketchPane.move(e)
  }

  _onPointerUp (e) {
    this.context.sketchPane.up(e)
    this._updateQuickErase(e)
  }

  _onKeyUp (e) {
    this._updateQuickErase(e)
  }

  _updateQuickErase (e) {
    // if we're not drawing
    if (!this.context.sketchPane.isDrawing()) {
      // and erase is not being requested
      if (!(e.buttons === 32 || e.altKey)) {
        // ... but we have a prevTool,
        if (this.context.store.getState().toolbar.prevTool) {
          // then switch out of quick-erase mode back to previous tool
          this.context.store.dispatch({ type: 'TOOLBAR_TOOL_QUICK_POP', meta: { scope: 'local' } })
        }
      }
    }
  }
}

  // canvasPointerDown (e) {
  //   // prevent overlapping calls
  //   if (this.container.getIsDrawingOrStabilizing()) return
  // 
  //   this.container.isPointerDown = true
  // 
  //   // via https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events#Determining_button_states
  //   if (e.buttons === 32 || e.buttons === 2) {
  //     this.container.isEraseButtonActive = true
  //   } else {
  //     this.container.isEraseButtonActive = false
  //   }
  // 
  //   // quick erase : on
  //   this.container.setQuickEraseIfRequested()
  // 
  //   if (!this.container.toolbar.getIsQuickErasing() && this.container.sketchPane.getIsErasing()) { // MIGRATED
  //     this.container.startMultiLayerOperation()
  //     this.container.setCompositeLayerVisibility(true)
  //   }
  // 
  //   this.container.lineMileageCounter.reset()
  // 
  //   // store snapshot on pointerdown?
  //   // eraser : yes
  //   // brushes: no
  //   if (this.container.sketchPane.getIsErasing()) { // FKA paintingKnockout
  //     if (this.isMultiLayerOperation) {
  //       this.emit('addToUndoStack', this.visibleLayersIndices)
  //     } else {
  //       this.emit('addToUndoStack')
  //     }
  //   }
  // 
  //   this.container.sketchPane.down(e)
  // 
  //   document.addEventListener('pointermove', this.container.canvasPointerMove)
  //   document.addEventListener('pointerup', this.container.canvasPointerUp)
  // 
  //   let pointerPosition = this.container.getRelativePosition(e.clientX, e.clientY)
  //   this.container.emit('pointerdown', pointerPosition.x, pointerPosition.y, e.pointerType === "pen" ? e.pressure : 1, e.pointerType)
  // }
  // 
  // canvasPointerUp (e) {
  //   this.container.isPointerDown = false
  // 
  //   // via https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events#Determining_button_states
  //   if (e.buttons == 32 || e.buttons == 2) {
  //     this.container.isEraseButtonActive = true
  //   } else {
  //     this.container.isEraseButtonActive = false
  //   }
  // 
  //   // force render remaining move events early, before frame loop
  //   this.container.renderEvents()
  //   // clear both event queues
  //   this.container.lastMoveEvent = null
  //   this.container.lastCursorEvent = null
  // 
  //   // let pointerPosition = this.container.getRelativePosition(e.clientX, e.clientY)
  // 
  //   this.container.sketchPane.up(e)
  // 
  //   this.container.emit('lineMileage', this.container.lineMileageCounter.get())
  //   document.removeEventListener('pointermove', this.container.canvasPointerMove)
  //   document.removeEventListener('pointerup', this.container.canvasPointerUp)
  // }
  // 
  // renderMoveEvent (moveEvent) {
  //   this.container.sketchPane.move(moveEvent)
  // }
  // 
  // startMultiLayerOperation () {
  //   let compositeContext = this.container.sketchPane.getLayerContext(this.container.compositeIndex)
  //   this.container.sketchPane.clearLayer(this.container.compositeIndex)
  // 
  //   this.container.drawComposite(this.container.visibleLayersIndices, compositeContext)
  // 
  //   // select that layer
  //   this.container.sketchPane.selectLayer(this.container.compositeIndex)
  // }
  // 
  // applyMultiLayerOperationByLayerIndex (index) {
  //   // apply result of erase bitmap to layer
  //   // code from SketchPane#drawPaintingCanvas
  //   let context = this.container.sketchPane.getLayerContext(index)
  //   let w = this.container.sketchPane.size.width
  //   let h = this.container.sketchPane.size.height
  //   context.save()
  //   context.globalAlpha = 1
  // 
  //   // paint the erase bitmap onto the given layer
  //   context.globalCompositeOperation = 'destination-out'
  //   context.drawImage(this.container.sketchPane.paintingCanvas, 0, 0, w, h)
  // 
  //   context.restore()
  // }
  //
  // dispose () {
  //   this.container.isPointerDown = false
  // 
  //   this.container.stopMultiLayerOperation()
  //   this.container.isMultiLayerOperation = false // ensure we reset the var
  // 
  //   // remove listeners
  //   document.removeEventListener('pointermove', this.container.canvasPointerMove)
  //   document.removeEventListener('pointerup', this.container.canvasPointerUp)
  // }
// }

class MovingStrategy {
  constructor (context) {
    this.context = context
    this.name = 'moving'

    this._onPointerDown = this._onPointerDown.bind(this)
    this._onPointerMove = this._onPointerMove.bind(this)
    this._onPointerUp = this._onPointerUp.bind(this)
  }

  startup () {
    this.state = {
      // down coords
      anchor: undefined,
      // move coords
      position: undefined,
      // diff
      diff: undefined,

      // did we move? aka dirty
      moved: false,
      // have we stamped to the textures yet?
      stamped: false
    }

    window.addEventListener('pointerdown', this._onPointerDown)
    window.addEventListener('pointerup', this._onPointerUp)

    this.context.containerEl.style.cursor = 'move'
    this.context.sketchPane.cursor.visible = false
  }

  shutdown () {
    if (this.state.moved && !this.state.stamped) {
      this._stamp()
    }

    window.removeEventListener('pointerdown', this._onPointerDown)
    window.removeEventListener('pointermove', this._onPointerMove)
    window.removeEventListener('pointerup', this._onPointerUp)

    this.context.containerEl.style.cursor = 'auto'
    this.context.sketchPane.cursor.visible = true
  }

  _onPointerDown (e) {
    this.state.anchor = this.context.sketchPane.localizePoint(e)
    this.state.moved = false
    window.addEventListener('pointermove', this._onPointerMove)
  }

  _onPointerMove (e) {
    this.state.position = this.context.sketchPane.localizePoint(e)

    this.state.diff = {
      x: Math.round(this.state.position.x - this.state.anchor.x),
      y: Math.round(this.state.position.y - this.state.anchor.y)
    }

    this.state.moved = true

    // render change
    for (let index of this.context.visibleLayersIndices) {
      this.context.sketchPane.layers[index].sprite.position = this.state.diff
    }
  }

  _onPointerUp (e) {
    this._stamp()
    window.removeEventListener('pointermove', this._onPointerMove)
  }

  _stamp () {
    // stamp position changes to textures
    for (let index of this.context.visibleLayersIndices) {
      // overwrite texture
      this.context.sketchPane.layers[index].rewrite()
      // reset position
      this.context.sketchPane.layers[index].sprite.position = { x: 0, y: 0 }
    }

    this.state.stamped = true
  }
}

// class MovingStrategy {
//   constructor (container) {
//     this.container = container
//     this.startAt = null
//     this.pos = null
//     this.offset = [0, 0]
// 
//     // store a composite of all the layers
//     // TODO is storedContext properly disposed?
//     let storedContext = this.container.createContext()
//     this.storedComposite = storedContext.canvas
//     this.container.drawComposite(this.container.visibleLayersIndices, storedContext)
// 
//     // store each of the layers individually
//     this.storedLayers = {}
//     for (let index of [0, 1, 3]) {// HACK hardcoded
//       let layerContext = this.container.sketchPane.getLayerContext(index)
//       let storedLayerContext = this.container.createContext()
//       let storedLayerCanvas = storedLayerContext.canvas
//       storedLayerContext.drawImage(layerContext.canvas, 0, 0)
//       // TODO is this.storedLayers properly disposed?
//       this.storedLayers[index] = {
//         canvas: storedLayerCanvas,
//         offset: [0, 0]
//       }
//     }
// 
//     this.container.cursorType = 'move'
//     this.container.renderCursor()
//   }
// 
//   canvasPointerDown (e) {
//     // prevent overlapping calls
//     if (this.container.getIsDrawingOrStabilizing()) return
// 
//     let pointerPosition = this.container.getRelativePosition(e.clientX, e.clientY)
//     this.startAt = [pointerPosition.x, pointerPosition.y]
//     this.pos = [0, 0]
//     this.container.lineMileageCounter.reset()
//     this.container.emit('addToUndoStack', [0, 1, 3]) // HACK hardcoded
// 
//     this.container.startMultiLayerOperation()
//     this.container.setCompositeLayerVisibility(true)
// 
//     // if we previously were in erase mode, undo its effects,
//     //   and ensure paintingCanvas is visible
//     this.container.sketchPane.setIsErasing(false)
// 
//     // fake an initial move event
//     this.container.canvasPointerMove(e)
// 
//     document.addEventListener('pointermove', this.container.canvasPointerMove)
//     document.addEventListener('pointerup', this.container.canvasPointerUp)
// 
//     // NOTE can trigger sound events using this:
//     // this.container.emit('pointerdown', pointerPosition.x, pointerPosition.y, e.pointerType === "pen" ? e.pressure : 1, e.pointerType)
//   }
// 
//   canvasPointerUp (e) {
//     // force render remaining move events early, before frame loop
//     this.container.renderEvents()
//     // clear both event queues
//     this.container.lastMoveEvent = null
//     this.container.lastCursorEvent = null
// 
//     // reset the painting layer
//     let size = this.container.sketchPane.getCanvasSize()
//     let paintingContext = this.container.sketchPane.paintingCanvas.getContext('2d')
//     paintingContext.clearRect(0, 0, size.width, size.height)
// 
//     // let pointerPosition = this.container.getRelativePosition(e.clientX, e.clientY)
//     this.container.stopMultiLayerOperation()
//     this.startAt = null
//     this.pos = null
// 
//     this.container.emit('markDirty', [0, 1, 3]) // HACK hardcoded
//     this.container.isMultiLayerOperation = false
// 
//     document.removeEventListener('pointermove', this.container.canvasPointerMove)
//     document.removeEventListener('pointerup', this.container.canvasPointerUp)
//   }
// 
//   renderMoveEvent (moveEvent) {
//     let compositeContext = this.storedComposite.getContext('2d')
//     let paintingContext = this.container.sketchPane.paintingCanvas.getContext('2d')
// 
//     let w = this.container.sketchPane.size.width
//     let h = this.container.sketchPane.size.height
// 
//     this.pos = [
//       moveEvent.x - this.startAt[0],
//       moveEvent.y - this.startAt[1]
//     ].map(Math.floor)
// 
//     if(moveEvent.shiftKey) {
//       if(Math.abs(this.pos[0]) > Math.abs(this.pos[1])) {
//         this.pos[1] = 0
//       } else {
//         this.pos[0] = 0
//       }
//     }
// 
//     // re-draw composite to the painting layer
//     paintingContext.clearRect(0, 0, w, h)
//     paintingContext.drawImage(compositeContext.canvas, this.pos[0] + this.offset[0], this.pos[1] + this.offset[1])
//   }
// 
//   startMultiLayerOperation () {
//     let compositeContext = this.container.sketchPane.getLayerContext(this.container.compositeIndex)
//     this.container.sketchPane.clearLayer(this.container.compositeIndex)
// 
//     // select that layer
//     this.container.sketchPane.selectLayer(this.container.compositeIndex)
//   }
// 
//   // actually move the layer content
//   applyMultiLayerOperationByLayerIndex (index) {
//     if (!this.pos) return
// 
//     let context = this.container.sketchPane.getLayerContext(index)
//     let w = this.container.sketchPane.size.width
//     let h = this.container.sketchPane.size.height
// 
//     this.storedLayers[index].offset[0] += this.pos[0]
//     this.storedLayers[index].offset[1] += this.pos[1]
// 
//     // HACK this is set 3 times, once for each layer
//     this.offset[0] = this.storedLayers[index].offset[0]
//     this.offset[1] = this.storedLayers[index].offset[1]
// 
//     context.save()
//     context.globalAlpha = 1
// 
//     context.clearRect(0, 0, w, h)
//     context.drawImage(this.storedLayers[index].canvas, this.storedLayers[index].offset[0], this.storedLayers[index].offset[1])
// 
//     context.restore()
//   }
// 
//   dispose () {
//     // force stop
//     this.container.stopMultiLayerOperation()
// 
//     this.container.updatePointer()
// 
//     this.container.cursorType = 'drawing'
//     this.container.renderCursor()
// 
//     this.storedLayers = null
// 
//     // remove listeners
//     document.removeEventListener('pointermove', this.container.canvasPointerMove)
//     document.removeEventListener('pointerup', this.container.canvasPointerUp)
//   }
// }
// 
// class ScalingStrategy {
//   constructor (container) {
//     this.container = container
// 
//     this.startAt = null
//     this.translate = [0, 0]
//     this.scale = 1
// 
//     this.container.cursorType = 'ew-resize'
//     this.container.renderCursor()
//   }
// 
//   canvasPointerDown (e) {
//     // prevent overlapping calls
//     if (this.container.getIsDrawingOrStabilizing()) return
// 
//     let pointerPosition = this.container.getRelativePosition(e.clientX, e.clientY)
//     this.startAt = [pointerPosition.x, pointerPosition.y]
//     this.translate = [this.startAt[0], this.startAt[1]]
//     this.scale = 1
// 
//     this.container.lineMileageCounter.reset()
//     this.container.emit('addToUndoStack', [0, 1, 3]) // HACK hardcoded
// 
//     this.container.startMultiLayerOperation()
//     this.container.setCompositeLayerVisibility(true)
// 
//     // if we previously were in erase mode, undo its effects,
//     //   and ensure paintingCanvas is visible
//     this.container.sketchPane.setIsErasing(false)
// 
//     // fake an initial move event
//     this.container.canvasPointerMove(e)
// 
//     document.addEventListener('pointermove', this.container.canvasPointerMove)
//     document.addEventListener('pointerup', this.container.canvasPointerUp)
// 
//     // NOTE can trigger sound events using this:
//     // this.container.emit('pointerdown', pointerPosition.x, pointerPosition.y, e.pointerType === "pen" ? e.pressure : 1, e.pointerType)
//   }
// 
//   canvasPointerUp (e) {
//     // force render remaining move events early, before frame loop
//     this.container.renderEvents()
//     // clear both event queues
//     this.container.lastMoveEvent = null
//     this.container.lastCursorEvent = null
// 
//     // reset the painting layer
//     let size = this.container.sketchPane.getCanvasSize()
//     let paintingContext = this.container.sketchPane.paintingCanvas.getContext('2d')
//     paintingContext.clearRect(0, 0, size.width, size.height)
// 
//     // let pointerPosition = this.container.getRelativePosition(e.clientX, e.clientY)
//     this.container.stopMultiLayerOperation()
// 
//     this.startAt = null
//     this.translate = [0, 0]
//     this.scale = 1
// 
//     this.container.emit('markDirty', [0, 1, 3]) // HACK hardcoded
//     this.container.isMultiLayerOperation = false
// 
//     document.removeEventListener('pointermove', this.container.canvasPointerMove)
//     document.removeEventListener('pointerup', this.container.canvasPointerUp)
//   }
// 
//   renderMoveEvent (moveEvent) {
//     let compositeContext = this.container.sketchPane.getLayerContext(this.container.compositeIndex)
//     let context = this.container.sketchPane.paintingCanvas.getContext('2d')
// 
//     let w = this.container.sketchPane.size.width
//     let h = this.container.sketchPane.size.height
// 
//     let deltaX = moveEvent.x - this.startAt[0]
// 
//     this.scale = 1 + (deltaX / w)
// 
//     // re-draw composite to the painting layer
//     context.save()
//     context.clearRect(0, 0, w, h)
//     context.translate(this.translate[0], this.translate[1])
//     context.scale(this.scale, this.scale)
//     context.translate(-this.translate[0], -this.translate[1])
//     context.drawImage(compositeContext.canvas, 0, 0)
//     context.restore()
//   }
// 
//   startMultiLayerOperation () {
//     let compositeContext = this.container.sketchPane.getLayerContext(this.container.compositeIndex)
//     this.container.sketchPane.clearLayer(this.container.compositeIndex)
// 
//     this.container.drawComposite(this.container.visibleLayersIndices, compositeContext)
// 
//     // select that layer
//     this.container.sketchPane.selectLayer(this.container.compositeIndex)
//   }
// 
//   applyMultiLayerOperationByLayerIndex (index) {
//     if (!this.startAt) return
// 
//     let context = this.container.sketchPane.getLayerContext(index)
//     let w = this.container.sketchPane.size.width
//     let h = this.container.sketchPane.size.height
// 
//     // store a copy
// 
//     let storedContext = this.container.createContext()
//     storedContext.drawImage(context.canvas, 0, 0)
// 
//     context.save()
//     context.globalAlpha = 1
// 
//     // clear the original
//     context.clearRect(0, 0, w, h)
// 
//     // draw with scaling
//     context.translate(this.translate[0], this.translate[1])
//     context.scale(this.scale, this.scale)
//     context.translate(-this.translate[0], -this.translate[1])
//     context.drawImage(storedContext.canvas, 0, 0)
// 
//     context.restore()
//   }
// 
//   dispose () {
//     // force stop
//     this.container.stopMultiLayerOperation()
// 
//     this.container.updatePointer()
// 
//     this.container.cursorType = 'drawing'
//     this.container.renderCursor()
// 
//     // remove listeners
//     document.removeEventListener('pointermove', this.container.canvasPointerMove)
//     document.removeEventListener('pointerup', this.container.canvasPointerUp)
//   }
// }

// class LockedStrategy {
//   constructor (container) {
//     this.container = container
// 
//     this.container.cursorType = 'not-allowed'
//     this.container.renderCursor()
//   }
// 
//   canvasPointerDown (e) {
//     this.container.isPointerDown = false
//   }
// 
//   canvasPointerUp (e) {
//   }
// 
//   renderMoveEvent (moveEvent) {
//   }
// 
//   startMultiLayerOperation () {
//   }
// 
//   applyMultiLayerOperationByLayerIndex (index) {
//   }
// 
//   dispose () {
//     this.container.cursorType = 'drawing'
//     this.container.renderCursor()
//   }
// }

module.exports = StoryboarderSketchPane
