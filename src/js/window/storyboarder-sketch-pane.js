const paper = require('paper')

const EventEmitter = require('events').EventEmitter

const { ipcRenderer } = require('electron')
const remote = require('@electron/remote')

const fs = require('fs')
const path = require('path')

const { SketchPane } = require('alchemancy')
const SketchPaneUtil = require('alchemancy').util

const MarqueeStrategy = require('./storyboarder-sketch-pane/marquee-strategy')

const LineMileageCounter = require('./line-mileage-counter')

const { createIsCommandPressed } = require('../utils/keytracker')
const observeStore = require('../shared/helpers/observeStore')

const sfx = require('../wonderunit-sound')

const prefsModule = require('@electron/remote').require('./prefs')

// TODO enableBrushCursor see: https://github.com/wonderunit/storyboarder/issues/1102
const enableBrushCursor = prefsModule.getPrefs('main')['enableBrushCursor']

const enableHighQualityDrawingEngine = prefsModule.getPrefs()['enableHighQualityDrawingEngine']

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

    this.marqueePath = null
    this.marqueeTransitionEvent = null

    this.onWindowBlurForApp = this.onWindowBlurForApp.bind(this)
    this.onWindowFocusForApp = this.onWindowFocusForApp.bind(this)
  }

  async load () {
    this.isCommandPressed = createIsCommandPressed(this.store)

    this.onKeyDown = this.onKeyDown.bind(this)
    this.onKeyUp = this.onKeyUp.bind(this)

    this.lineMileageCounter = new LineMileageCounter()

    // FPS Meter used by DrawingStrategy
    this.fpsMeter = new FPSMeter()

    // container
    this.containerEl = document.createElement('div')
    this.containerEl.classList.add('container')

    // sketchpane
    this.sketchPane = new SketchPane({
      imageWidth: this.canvasSize[0],
      imageHeight: this.canvasSize[1],
      backgroundColor: 0x333333,
      onWebGLContextLost: this.onWebGLContextLost
    })

    this.sketchPane.efficiencyMode = !enableHighQualityDrawingEngine

    try {
      await this.sketchPane.loadBrushes({
        brushes: JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'data', 'brushes', 'brushes.json'))),
        brushImagePath: path.join(__dirname, '..', '..', 'data', 'brushes')
      })
    } catch (err) {
      console.error(err)
      remote.dialog.showMessageBox({
        type: 'error',
        message: 'Could not load brushes.\n\nError: ' + err
      })
      throw err
    }

    this.sketchPaneDOMElement = this.sketchPane.getDOMElement()

    // 0 = shot-generator
    this.sketchPane.newLayer({ name: 'shot-generator' })
    // 1 = reference
    this.sketchPane.newLayer({ name: 'reference' })
    // 2 = fill
    this.sketchPane.newLayer({ name: 'fill' })
    // 3 = tone
    this.sketchPane.newLayer({ name: 'tone' })
    // 4 = pencil
    this.sketchPane.newLayer({ name: 'pencil' })
    // 5 = ink
    this.sketchPane.newLayer({ name: 'ink' })
    // 6 = onion
    this.sketchPane.newLayer({ name: 'onion' })
    // 7 = notes
    this.sketchPane.newLayer({ name: 'notes' })
    // 8 = guides
    this.sketchPane.newLayer({ name: 'guides' })
    // 9 = composite
    this.sketchPane.newLayer({ name: 'composite' })

    this.sketchPane.setCurrentLayerIndex(
      this.sketchPane.layers.findByName('fill').index
    )

    // a list of all the active layer indices
    // for multi-erase, move, and scale, this is all the indices that will be stamped
    this.visibleLayersIndices = [
      this.sketchPane.layers.findByName('shot-generator').index,
      this.sketchPane.layers.findByName('reference').index,
      this.sketchPane.layers.findByName('fill').index,
      this.sketchPane.layers.findByName('tone').index,
      this.sketchPane.layers.findByName('pencil').index,
      this.sketchPane.layers.findByName('ink').index,
      this.sketchPane.layers.findByName('notes').index
    ]

    // TODO minimum update (e.g.: maybe just cursor size?)
    // sync sketchpane to state
    const syncSketchPaneState = toolbarState => {
      if (toolbarState.activeTool != null) {
        const tool = toolbarState.tools[toolbarState.activeTool]
        this.sketchPane.brush = this.sketchPane.brushes[tool.name]
        this.sketchPane.brushColor = tool.color
        this.sketchPane.brushSize = tool.size

        this.sketchPane.nodeOpacityScale = tool.nodeOpacity
        this.sketchPane.strokeOpacityScale = tool.strokeOpacity

        // TODO move to a reducer?
        // if we're not erasing ...
        if (toolbarState.activeTool !== 'eraser') {
          // ... set the current layer based on the active tool
          this.sketchPane.setCurrentLayerIndex(
            this.sketchPane.layers.findByName(tool.defaultLayerName).index
          )
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

    this.sketchPane.onStrokeBefore = strokeState =>
      this.emit('addToUndoStack', strokeState.layerIndices)

    this.sketchPane.onStrokeAfter = strokeState =>
      this.emit('markDirty', strokeState.layerIndices)

    window.addEventListener('keydown', this.onKeyDown)
    window.addEventListener('keyup', this.onKeyUp)

    this.strategies = {
      drawing: new DrawingStrategy(this),
      moving: new MovingStrategy(this),
      scaling: new ScalingStrategy(this),
      locked: new LockedStrategy(this),
      panning: new PanningStrategy(this),
      lineDrawing: new LineDrawingStrategy(this),
      marquee: new MarqueeStrategy(this)
    }

    this.store.dispatch({ type: 'TOOLBAR_MODE_SET', payload: 'drawing', meta: { scope: 'local' } })

    this.ro = new window.ResizeObserver(entries =>
      // see: https://github.com/wonderunit/storyboarder/issues/1218
      //
      // The clientRect emitted from ResizeObserver returns
      // native pixels instead of device independent pixels
      // which means that the width and height will end up
      // being 2x the expected size when running in
      // 200% DPI scaling on Windows
      //
      // Apparently, getBoundingClientRect won't work because of zooming.
      //
      // offsetWidth/offsetHeight are our best bet.
      //
      // https://bugs.chromium.org/p/chromium/issues/detail?id=724971
      // https://github.com/desktop/desktop/issues/2480#issuecomment-337554750
      //
      // TODO try this in future versions of Chromium
      // this.resize(entries[0].contentRect.width, entries[0].contentRect.height)

      // use offsetWidth / offsetHeight, which return expected pixel values
      this.resize(entries[0].target.offsetWidth, entries[0].target.offsetHeight)
    )
    this.ro.observe(this.containerEl)

    // add SketchPane to container
    this.containerEl.appendChild(this.sketchPaneDOMElement)

    // add container to element
    this.el.appendChild(this.containerEl)

    window.addEventListener('blur', this.onWindowBlurForApp)
    window.addEventListener('focus', this.onWindowFocusForApp)
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

  setIsLocked (shouldLock) {
    // console.log('StoryboarderSketchPane#setIsLocked', shouldLock)
    if (shouldLock) {
      this.store.dispatch({
        type: 'TOOLBAR_MODE_SET',
        payload: 'locked',
        meta: {
          scope: 'local'
        }
      })
    } else {
      // if currently locked
      if (this.strategy instanceof LockedStrategy) {
        // force a shutdown (because LockedStrategy is always `busy` and prevents otherwise)
        this.store.dispatch({
          type: 'TOOLBAR_MODE_STATUS_SET',
          payload: 'idle',
          meta: {
            scope: 'local'
          }
        })

        this.store.dispatch({
          type: 'TOOLBAR_MODE_SET',
          payload: 'drawing',
          meta: {
            scope: 'local'
          }
        })
      }
    }
  }

  getIsLocked () {
    return this.strategy instanceof LockedStrategy
  }

  preventIfLocked () {
    if (this.strategy instanceof LockedStrategy) {
      remote.dialog.showMessageBox({
        message: 'The current board is linked to a PSD and cannot be changed. ' +
                 'To unlink, double-click the board art.'
      })
      return true
    } else {
      return false
    }
  }

  getUndoStateForLayer (index) {
    // store raw pixels with premultiplied alpha
    return {
      index,
      pixels: this.sketchPane.layers[index].pixels(false),
      premultiplied: true
    }
  }
  applyUndoStateForLayer (state) {
    let source = state.source
    // un-premultiply pixels, but only once
    if (source.premultiplied) {
      SketchPaneUtil.arrayPostDivide(source.pixels)
      // changes source, which is a reference to an to undostack state
      source.premultiplied = false
    }
    // TODO try directly creating texture from pixel data via texImage2D
    this.sketchPane.layers[source.index].replaceTextureFromCanvas(
      SketchPaneUtil.pixelsToCanvas(
        source.pixels,
        this.sketchPane.width,
        this.sketchPane.height
      )
    )
  }

  onKeyDown (e) {
    if (this.isCommandPressed('drawing:scale-mode')) {
      // switch to scale strategy
      // switch to move strategy
      // attempt change
      this.store.dispatch({
        type: 'TOOLBAR_MODE_SET',
        payload: 'scaling',
        meta: { scope: 'local' }
      })
      // play a sound if it worked
      if (this.store.getState().toolbar.mode === 'scaling') {
        sfx.playEffect('metal')
      }
    } else if (this.isCommandPressed('drawing:move-mode')) {
      // switch to move strategy
      // attempt change
      this.store.dispatch({
        type: 'TOOLBAR_MODE_SET',
        payload: 'moving',
        meta: { scope: 'local' }
      })
      // play a sound if it worked
      if (this.store.getState().toolbar.mode === 'moving') {
        sfx.playEffect('metal')
      }
    } else if (this.isCommandPressed('drawing:pan-mode')) {
      if (this.store.getState().toolbar.mode !== 'panning') {
        if (this.sketchPane.zoom > 1) {
          this.store.dispatch({
            type: 'TOOLBAR_MODE_SET',
            payload: 'panning',
            meta: { scope: 'local' }
          })
        }
      }
    }

    if (this.getIsDrawingOrStabilizing()) {
      if (this.isCommandPressed('drawing:straight-line')) {
        this.sketchPane.setIsStraightLine(true)
      }
      if (this.isCommandPressed('drawing:straight-line-snap')) {
        this.sketchPane.setShouldSnap(true)
      }
    } else {
      if (this.isCommandPressed('drawing:straight-line')) {
        this.store.dispatch({ type: 'TOOLBAR_MODE_SET', payload: 'lineDrawing', meta: { scope: 'local' } })
      }
    }
  }

  onKeyUp (e) {
    // HACK ignore any key up while in marquee selection mode
    if (this.store.getState().toolbar.mode === 'marquee') {
      return
    }

    if ( !(this.isCommandPressed('drawing:scale-mode') || this.isCommandPressed('drawing:move-mode')) ) {
      // switch to default strategy (drawing)
      // attempt change
      this.store.dispatch({
        type: 'TOOLBAR_MODE_SET',
        payload: 'drawing',
        meta: { scope: 'local' }
      })
      // play a sound if it worked
      if (this.store.getState().toolbar.mode === 'drawing') {
        sfx.playEffect('metal')
      }
    }

    if (!this.isCommandPressed('drawing:straight-line')) {
      // this.sketchPane.setIsStraightLine(false)
    }
    if (!this.isCommandPressed('drawing:straight-line-snap')) {
      this.sketchPane.setShouldSnap(false)
    }
  }

  onWindowBlurForApp () {
    this.sketchPane.app.stop()
  }
  onWindowFocusForApp () {
    this.sketchPane.app.start()
  }

  mergeLayers (sources, destination) {
    const dirty = [...new Set(sources.concat(destination))]

    // save an undo snapshot
    this.emit('addToUndoStack', dirty)

    this.sketchPane.layers.merge(sources, destination)

    // mark all layers dirty
    this.emit('markDirty', dirty)
  }

  resize (width, height) {
    this.sketchPane.resize(width, height)
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

  // TODO rename to isDrawing, find/replace instances
  getIsDrawingOrStabilizing () {
    return (
      // the sketchpane is drawing
      this.sketchPane.isDrawing() || 
      // or it's not Locked, but it is busy
      (!this.getIsLocked() && this.store.getState().toolbar.modeStatus === 'busy')
    )
  }

  //
  //
  // compatibility methods
  //
  // getLayerCanvas (index) {
  //   return this.sketchPane.getLayerCanvas(index)
  // }
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
    this.sketchPane.markLayersDirty(indices)
  }
  getLayerDirty (index) {
    return this.sketchPane.getLayerDirty(index)
  }
  clearLayerDirty (index) {
    this.sketchPane.clearLayerDirty(index)
  }
  zoomAtCursor (scale) {
    this.zoomAt(this.sketchPane.cursor.lastPointer, scale)
  }
  zoomAt (point, scale) {
    if (scale > 1) {
      this.sketchPane.anchor = new PIXI.Point(
        point.x - this.sketchPane.viewClientRect.left,
        point.y - this.sketchPane.viewClientRect.top
      )
    } else {
      this.sketchPane.anchor = null
    }
    this.sketchPane.zoom = scale
    this.sketchPane.resize(
      this.sketchPane.app.renderer.width,
      this.sketchPane.app.renderer.height
    )
    this.sketchPane.cursor.renderCursor(this.sketchPane.cursor.lastPointer)
  }
  zoomCenter (value) {
    this.sketchPane.anchor = null
    this.sketchPane.zoom = value
    this.sketchPane.resize(
      this.sketchPane.app.renderer.width,
      this.sketchPane.app.renderer.height
    )
  }

  shouldWarnAboutFps () {
    return (
      this.fpsMeter.hadLowFps() &&
      !this.sketchPane.efficiencyMode
    )
  }
}

// poly lines
class LineDrawingStrategy {
  constructor (context) {
    this.context = context
    this.name = 'lineDrawing'

    this._onPointerOver = this._onPointerOver.bind(this)
    this._onPointerOut = this._onPointerOut.bind(this)
    this._onPointerDown = this._onPointerDown.bind(this)
    this._onPointerMove = this._onPointerMove.bind(this)

    this._onKeyUp = this._onKeyUp.bind(this)
  }

  startup () {
    this.context.sketchPaneDOMElement.addEventListener('pointerover', this._onPointerOver)
    this.context.sketchPaneDOMElement.addEventListener('pointerout', this._onPointerOut)

    this.context.sketchPaneDOMElement.addEventListener('pointerdown', this._onPointerDown)
    document.addEventListener('pointermove', this._onPointerMove)
    document.addEventListener('pointerup', this._onPointerUp)
    window.addEventListener('keyup', this._onKeyUp)

    this.context.fpsMeter.start()
    this.context.store.dispatch({ type: 'TOOLBAR_MODE_STATUS_SET', payload: 'busy', meta: { scope: 'local' } })

    this.state = {
      started: false
    }

    this.context.sketchPane.app.view.style.cursor = 'none'
  }
  shutdown () {
    this.context.sketchPaneDOMElement.removeEventListener('pointerover', this._onPointerOver)
    this.context.sketchPaneDOMElement.removeEventListener('pointerout', this._onPointerOut)

    this.context.sketchPaneDOMElement.removeEventListener('pointerdown', this._onPointerDown)
    document.removeEventListener('pointermove', this._onPointerMove)
    document.removeEventListener('pointerup', this._onPointerUp)
    window.removeEventListener('keyup', this._onKeyUp)

    this.context.fpsMeter.stop()
  }

  _onPointerOver (e) {
    this.context.sketchPane.cursor.setEnabled(true)
  }

  _onPointerOut (e) {
    let point = this.context.sketchPane.localizePoint(e)

    // only hide the cursor if actually out-of-bounds
    if (!this._inBounds(point)) {
      this.context.sketchPane.cursor.setEnabled(false)
    }
  }

  _inBounds (point) {
    return (
      point.x >= 0 &&
      point.y >= 0 &&
      point.x <= this.context.sketchPane.width &&
      point.y <= this.context.sketchPane.height
    )
  }

  _normalizeEvent (e) {
    // clone the event with a few changes
    e = {
      x: e.x,
      y: e.y,

      // override pressure
      // (although not used currently
      //  because straightLinePressure handles this for us)
      pressure: 0.5,

      // pretend its a mouse so SketchPane will ignore tilt
      pointerType: 'mouse',

      // alternately, we could override these,
      // and use the event's pointerType
      //
      // pointerType: e.pointerType,
      tiltX: e.tiltX,
      tiltY: e.tiltY
    }
    return e
  }

  _onPointerDown (e) {
    // trigger layer opacity check
    this.context.emit('beforePointerDown')

    let nextEvent

    if (this.state.started) {
      // line has been in-progress, so stop current line
      let wasDrawing = this.context.sketchPane.isDrawing()

      this.context.sketchPane.up(e)

      // start where we left off
      let lastPoint = this.context.sketchPane.globalizePoint(
        this.context.sketchPane.strokeState.points[
          this.context.sketchPane.strokeState.points.length - 1
        ]
      )
      nextEvent = this._normalizeEvent({
        x: lastPoint.x,
        y: lastPoint.y,
        pressure: e.pressure,
        tiltX: e.tiltX,
        tiltY: e.tiltY
      })

      if (wasDrawing) {
        this.context.emit('lineMileage', this.context.lineMileageCounter.get())

        // audible event for Sonifier
        // this.context.emit('pointerup', this.context.sketchPane.localizePoint(e))
      }
    } else {
      // starting a new line
      this.state.started = true
      nextEvent = this._normalizeEvent(e)
    }

    let toolbarState = this.context.store.getState().toolbar

    let options = {
      isStraightLine: true,
      shouldSnap: this.context.isCommandPressed('drawing:straight-line-snap'),
       // TODO could we remove this and handle pressure override logic at the event level?
      straightLinePressure: 0.5,
      erase: toolbarState.activeTool === 'eraser'
        ? this.context.visibleLayersIndices
        : false
    }

    this.context.sketchPane.down(nextEvent, options)

    this.context.lineMileageCounter.reset()

    // audible event for Sonifier
    this.context.emit('pointerdown', this.context.sketchPane.localizePoint(nextEvent))
  }

  _onPointerMove (e) {
    let point = this.context.sketchPane.localizePoint(e)

    // always re-enable if in bounds
    if (this._inBounds(point)) {
      this.context.sketchPane.cursor.setEnabled(true)
    }

    // always update the cursor
    this.context.sketchPane.move(this._normalizeEvent(e))

    if (this.context.sketchPane.isDrawing()) {
      // track X/Y on the full-size texture
      this.context.lineMileageCounter.add(point)

      // audible event for Sonifier
      this.context.emit('pointermove', point)
    }
  }

  _onKeyUp (e) {
    if (!this.context.isCommandPressed('drawing:straight-line')) {
      if (this.context.sketchPane.isDrawing()) {
        this.context.sketchPane.stopDrawing({ cancel: true })
      }
      this.context.store.dispatch({ type: 'TOOLBAR_MODE_STATUS_SET', payload: 'idle', meta: { scope: 'local' } })
      this.context.store.dispatch({ type: 'TOOLBAR_MODE_SET', payload: 'drawing', meta: { scope: 'local' } })
    }
  }
}

class DrawingStrategy {
  constructor (context) {
    this.context = context
    this.name = 'drawing'

    this._onPointerOver = this._onPointerOver.bind(this)
    this._onPointerOut = this._onPointerOut.bind(this)
    this._onPointerDown = this._onPointerDown.bind(this)
    this._onPointerMove = this._onPointerMove.bind(this)
    this._onPointerUp = this._onPointerUp.bind(this)
    this._onKeyUp = this._onKeyUp.bind(this)
    this._onWheel = this._onWheel.bind(this)

    let delay = prefsModule.getPrefs().straightLineDelayInMsecs
    if (delay) {
      this._onIdle = this._onIdle.bind(this)
      this._idleTimer = new IdleTimer(this._onIdle, delay)
    }
  }

  startup () {
    this.context.sketchPaneDOMElement.addEventListener('pointerover', this._onPointerOver)
    this.context.sketchPaneDOMElement.addEventListener('pointerout', this._onPointerOut)

    this.context.sketchPaneDOMElement.addEventListener('pointerdown', this._onPointerDown)
    document.addEventListener('pointermove', this._onPointerMove)
    document.addEventListener('pointerup', this._onPointerUp)
    window.addEventListener('keyup', this._onKeyUp)

    this.context.sketchPaneDOMElement.addEventListener('wheel', this._onWheel, { passive: true })
  }
  shutdown () {
    // if we ever needed to shutdown DURING drawing, this would be useful
    // if (this.context.sketchPane.isDrawing()) {
    //   this.context.sketchPane.stopDrawing()
    //   this.context.store.dispatch({ type: 'TOOLBAR_MODE_STATUS_SET', payload: 'idle', meta: { scope: 'local' } })
    // }

    this.context.sketchPaneDOMElement.removeEventListener('pointerover', this._onPointerOver)
    this.context.sketchPaneDOMElement.removeEventListener('pointerout', this._onPointerOut)

    this.context.sketchPaneDOMElement.removeEventListener('pointerdown', this._onPointerDown)
    document.removeEventListener('pointermove', this._onPointerMove)
    document.removeEventListener('pointerup', this._onPointerUp)
    window.removeEventListener('keyup', this._onKeyUp)

    this.context.sketchPaneDOMElement.removeEventListener('wheel', this._onWheel)

    this.context.sketchPane.app.view.style.cursor = 'auto'

    this.context.fpsMeter.stop()

    this._idleTimer && this._idleTimer.clear()
  }

  _inBounds (point) {
    return (
      point.x >= 0 &&
      point.y >= 0 &&
      point.x <= this.context.sketchPane.width &&
      point.y <= this.context.sketchPane.height
    )
  }

  _onPointerOver (e) {
    this.context.sketchPane.cursor.setEnabled(true)
  }

  _onPointerOut (e) {
    let point = this.context.sketchPane.localizePoint(e)

    // only hide the cursor if actually out-of-bounds
    if (!this._inBounds(point)) {
      this.context.sketchPane.cursor.setEnabled(false)
    }
  }

  // TODO could store multiErase status / erase layer array in a reducer?
  _onPointerDown (e) {
    // trigger layer opacity check
    this.context.emit('beforePointerDown')

    this._idleTimer && this._idleTimer.reset()

    this.context.store.dispatch({ type: 'TOOLBAR_MODE_STATUS_SET', payload: 'busy', meta: { scope: 'local' } })

    // configure the tool for drawing

    // stroke options
    let options = {}

    let toolbarState = this.context.store.getState().toolbar

    if (!toolbarState.prevTool &&
        toolbarState.activeTool === 'eraser') {
      // regular eraser
      options.erase = this.context.visibleLayersIndices
    } else {
      // via https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events#Determining_button_states
      // is the user requesting to erase?
      options = (e.buttons === 32 || e.buttons === 2 || this.context.isCommandPressed('drawing:quick-erase-modifier'))
        // is the shift key down?
        ? e.shiftKey
          // ... then, erase multiple layers
          ? { erase: this.context.visibleLayersIndices }
          // ... otherwise, only erase current layer
          : { erase: [this.context.sketchPane.getCurrentLayerIndex()] }
        // not erasing
        : {}

      if (options.erase) {
        // switch to quick-erase mode
        this.context.store.dispatch({ type: 'TOOLBAR_TOOL_QUICK_PUSH', payload: 'eraser', meta: { scope: 'local' } })
      }

      this.context.fpsMeter.start()
    }

    if (!options.erase) {
      if (this.context.isCommandPressed('drawing:straight-line')) {
        options.isStraightLine = true
      }
    }

    // sync sketchPane to the current toolbar state
    // syncSketchPaneState(this.store.getState().toolbar)

    this.context.sketchPane.down(e, options)
    this.context.lineMileageCounter.reset()

    // audible event for Sonifier
    this.context.emit('pointerdown', this.context.sketchPane.localizePoint(e))
  }

  _onPointerMove (e) {
    let point = this.context.sketchPane.localizePoint(e)

    if (
      // drawing
      this.context.sketchPane.isDrawing() &&
      // but not in straight line mode yet
      !this.context.sketchPane.getIsStraightLine()
    ) {
      let points = this.context.sketchPane.strokeState.points
      let prev = points[points.length - 1]
      if (prev) {
        // is there a 1px difference in either direction since the last recorded point?
        if (Math.abs(prev.x - point.x) > 1 || Math.abs(prev.y - point.y) > 1) {
          // reset the timer
          this._idleTimer && this._idleTimer.reset()
        }
      }
    }

    // always re-enable if in bounds
    if (this._inBounds(point)) {
      this.context.sketchPane.cursor.setEnabled(true)
    }

    // always update the cursor
    this.context.sketchPane.move(e)

    if (this.context.sketchPane.isDrawing()) {
      // track X/Y on the full-size texture
      this.context.lineMileageCounter.add(point)

      // audible event for Sonifier
      this.context.emit('pointermove', point)
    }
  }

  _onPointerUp (e) {
    let wasDrawing = this.context.sketchPane.isDrawing()

    this.context.sketchPane.up(e)

    this._updateQuickErase(e)
    this.context.store.dispatch({ type: 'TOOLBAR_MODE_STATUS_SET', payload: 'idle', meta: { scope: 'local' } })

    // clear the timer
    this._idleTimer && this._idleTimer.clear()

    if (wasDrawing) {
      this.context.emit('lineMileage', this.context.lineMileageCounter.get())

      // audible event for Sonifier
      this.context.emit('pointerup', this.context.sketchPane.localizePoint(e))
    }
    this.context.fpsMeter.stop()
  }

  _onKeyUp (e) {
    this._updateQuickErase(e)
  }

  _onWheel (e) {
    // zoom
    let delta = e.deltaY / 100
    let scale = Math.min(Math.max(this.context.sketchPane.zoom + delta, 0.25), 5)
    this.context.zoomAt(e, scale)
  }

  _onIdle () {
    this.context.sketchPane.setIsStraightLine(true)
  }

  _updateQuickErase (e) {
    // if we're not drawing
    if (!this.context.sketchPane.isDrawing()) {
      // and erase is not being requested
      if (!(e.buttons === 32 || e.buttons === 2 || this.context.isCommandPressed('drawing:quick-erase-modifier'))) {
        // ... but we have a prevTool,
        if (this.context.store.getState().toolbar.prevTool) {
          // then switch out of quick-erase mode back to previous tool
          this.context.store.dispatch({ type: 'TOOLBAR_TOOL_QUICK_POP', meta: { scope: 'local' } })
        }
      }
    }
  }
}

class MovingStrategy {
  constructor (context) {
    this.context = context
    this.name = 'moving'

    this._onPointerDown = this._onPointerDown.bind(this)
    this._onPointerMove = this._onPointerMove.bind(this)
    this._onPointerUp = this._onPointerUp.bind(this)

    this._onWindowBlur = this._onWindowBlur.bind(this)
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

    this.context.sketchPaneDOMElement.addEventListener('pointerdown', this._onPointerDown)
    this.context.sketchPaneDOMElement.addEventListener('pointerup', this._onPointerUp)

    window.addEventListener('blur', this._onWindowBlur)

    this.context.sketchPane.app.view.style.cursor = 'move'
    this.context.sketchPane.cursor.setEnabled(false)
  }

  shutdown () {
    if (this.state.moved && !this.state.stamped) {
      this._stamp()
      this.context.emit('markDirty', this.context.visibleLayersIndices)
    }

    this.context.sketchPaneDOMElement.removeEventListener('pointerdown', this._onPointerDown)
    this.context.sketchPaneDOMElement.removeEventListener('pointermove', this._onPointerMove)
    this.context.sketchPaneDOMElement.removeEventListener('pointerup', this._onPointerUp)

    window.removeEventListener('blur', this._onWindowBlur)

    this.context.sketchPane.cursor.setEnabled(true)
    this.context.sketchPane.app.view.style.cursor = 'auto'
  }

  _onPointerDown (e) {
    this.context.emit('addToUndoStack', this.context.visibleLayersIndices)
    this.state.anchor = this.context.sketchPane.localizePoint(e)
    this.state.moved = false
    this.context.sketchPaneDOMElement.addEventListener('pointermove', this._onPointerMove)
  }

  _onPointerMove (e) {
    this.state.position = this.context.sketchPane.localizePoint(e)

    this.state.diff = {
      x: Math.round(this.state.position.x - this.state.anchor.x),
      y: Math.round(this.state.position.y - this.state.anchor.y)
    }

    // shift to move in a straight line
    if (e.shiftKey) {
      if (Math.abs(this.state.diff.x) > Math.abs(this.state.diff.y)) {
        this.state.diff.y = 0
      } else {
        this.state.diff.x = 0
      }
    }

    this.state.moved = true

    // render change
    this._render()

    // kind of a hack, but make sure the sketchPane always tracks where the cursor is, even during the move
    this.context.sketchPane.move(e)

    // but be sure to takeover the cursor again
    this.context.sketchPane.app.view.style.cursor = 'move'
  }

  _onPointerUp (e) {
    this._stamp()
    this.context.emit('markDirty', this.context.visibleLayersIndices)
    this.context.sketchPaneDOMElement.removeEventListener('pointermove', this._onPointerMove)
  }

  _onWindowBlur () {
    // attempt to gracefully transition back to drawing
    this.context.store.dispatch({ type: 'TOOLBAR_MODE_SET', payload: 'drawing', meta: { scope: 'local' } })
  }

  _render () {
    for (let index of this.context.visibleLayersIndices) {
      this.context.sketchPane.layers[index].sprite.position.set(this.state.diff.x, this.state.diff.y)
    }
  }

  _stamp () {
    // stamp position changes to textures
    for (let index of this.context.visibleLayersIndices) {
      // overwrite texture
      this.context.sketchPane.layers[index].rewrite()
      // reset position
      this.context.sketchPane.layers[index].sprite.position.set(0, 0)
    }

    this.state.stamped = true
  }
}

class ScalingStrategy {
  constructor (context) {
    this.context = context
    this.name = 'scaling'

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

    this.context.sketchPaneDOMElement.addEventListener('pointerdown', this._onPointerDown)
    this.context.sketchPaneDOMElement.addEventListener('pointerup', this._onPointerUp)

    this.context.sketchPane.app.view.style.cursor = 'ew-resize'
    this.context.sketchPane.cursor.setEnabled(false)
  }

  shutdown () {
    if (this.state.moved && !this.state.stamped) {
      this._stamp()
      this.context.emit('markDirty', this.context.visibleLayersIndices)
    }

    this.context.sketchPaneDOMElement.removeEventListener('pointerdown', this._onPointerDown)
    this.context.sketchPaneDOMElement.removeEventListener('pointermove', this._onPointerMove)
    this.context.sketchPaneDOMElement.removeEventListener('pointerup', this._onPointerUp)

    this.context.sketchPane.app.view.style.cursor = 'auto'
    this.context.sketchPane.cursor.setEnabled(true)
  }

  _onPointerDown (e) {
    this.context.emit('addToUndoStack', this.context.visibleLayersIndices)
    this.state.anchor = this.context.sketchPane.localizePoint(e)
    this.state.moved = false
    this.context.sketchPaneDOMElement.addEventListener('pointermove', this._onPointerMove)
  }

  _onPointerMove (e) {
    this.state.position = this.context.sketchPane.localizePoint(e)

    this.state.diff = {
      x: Math.round(this.state.position.x - this.state.anchor.x),
      y: Math.round(this.state.position.y - this.state.anchor.y)
    }

    // // shift to scale in a straight line
    // if (e.shiftKey) {
    //   if (Math.abs(this.state.diff.x) > Math.abs(this.state.diff.y)) {
    //     this.state.diff.y = 0
    //   } else {
    //     this.state.diff.x = 0
    //   }
    // }

    this.state.moved = true

    // render change
    this._render()

    // kind of a hack, but make sure the sketchPane always tracks where the cursor is, even during the move
    this.context.sketchPane.move(e)
    // but be sure to takeover the cursor again
    this.context.sketchPane.app.view.style.cursor = 'ew-resize'
  }

  _onPointerUp (e) {
    this._stamp()
    this.context.emit('markDirty', this.context.visibleLayersIndices)
    this.context.sketchPaneDOMElement.removeEventListener('pointermove', this._onPointerMove)
  }

  _render () {
    let scale = 1 + (this.state.diff.x / this.context.sketchPane.width)

    for (let index of this.context.visibleLayersIndices) {
      let sprite = this.context.sketchPane.layers[index].sprite
      let width = this.context.sketchPane.width
      let height = this.context.sketchPane.height

      // console.log(
      //   'sprite.anchor',
      //   'from', sprite.anchor,
      //   'to', this.state.anchor.x / width, this.state.anchor.y / height
      // )

      sprite.anchor.set(this.state.anchor.x / width, this.state.anchor.y / height)
      sprite.scale.set(scale, scale)
      sprite.position.set(this.state.anchor.x, this.state.anchor.y)
    }
  }

  _stamp () {
    // stamp position changes to textures
    for (let index of this.context.visibleLayersIndices) {
      // overwrite texture
      this.context.sketchPane.layers[index].rewrite()

      // reset position
      this.context.sketchPane.layers[index].sprite.position.set(0, 0)
      // reset scale
      this.context.sketchPane.layers[index].sprite.scale.set(1, 1)
      // reset anchor
      this.context.sketchPane.layers[index].sprite.anchor.set(0, 0)
    }

    this.state.stamped = true
  }
}

class LockedStrategy {
  constructor (context) {
    this.context = context
    this.name = 'locked'

    this.cursor = 'not-allowed'

    this._onDblClick = this._onDblClick.bind(this)

    this._onPointerDown = this._onPointerDown.bind(this)
    this._onPointerMove = this._onPointerMove.bind(this)
    this._onPointerUp = this._onPointerUp.bind(this)
  }

  startup () {
    this.context.store.dispatch({ type: 'TOOLBAR_MODE_STATUS_SET', payload: 'busy', meta: { scope: 'local' } })

    this.context.containerEl.addEventListener('dblclick', this._onDblClick)

    this.context.sketchPaneDOMElement.addEventListener('pointerdown', this._onPointerDown)
    this.context.sketchPaneDOMElement.addEventListener('pointermove', this._onPointerMove)
    this.context.sketchPaneDOMElement.addEventListener('pointerup', this._onPointerUp)

    this.context.sketchPane.cursor.setEnabled(false)
  }

  shutdown () {
    this.context.containerEl.removeEventListener('dblclick', this._onDblClick)

    this.context.sketchPaneDOMElement.removeEventListener('pointerdown', this._onPointerDown)
    this.context.sketchPaneDOMElement.removeEventListener('pointermove', this._onPointerMove)
    this.context.sketchPaneDOMElement.removeEventListener('pointerup', this._onPointerUp)

    this.context.sketchPane.cursor.setEnabled(true)
  }

  _onPointerDown (e) {
    // kind of a hack, but make sure the sketchPane always tracks where the cursor is, even during the move
    this.context.sketchPane.move(e)

    this._render()
    this.context.sketchPaneDOMElement.addEventListener('pointermove', this._onPointerMove)
  }

  _onPointerMove (e) {
    this._render()
  }

  _onPointerUp (e) {
    this._render()
    this.context.sketchPaneDOMElement.removeEventListener('pointermove', this._onPointerMove)
  }

  _render (e) {
    // but be sure to takeover the cursor again
    this.context.sketchPane.app.view.style.cursor = this.cursor
  }

  _onDblClick (event) {
    this.context.emit('requestUnlock')
  }
}

class PanningStrategy {
  constructor (context) {
    this.context = context
    this.name = 'Panning'

    this._onPointerDown = this._onPointerDown.bind(this)
    this._onPointerMove = this._onPointerMove.bind(this)
    this._onPointerUp = this._onPointerUp.bind(this)

    this._onWindowBlur = this._onWindowBlur.bind(this)
  }

  startup () {
    this.state = {
      // down coords
      starting: { x: null, y: null },
      // move coords
      position: { x: null, y: null },
      // dest
      dest: { x: null, y: null },
      // dirty?
      moved: false,
      // down?
      down: false
    }

    this.context.sketchPaneDOMElement.addEventListener('pointerdown', this._onPointerDown)
    this.context.sketchPaneDOMElement.addEventListener('pointerup', this._onPointerUp)

    window.addEventListener('blur', this._onWindowBlur)

    this.context.sketchPane.cursor.setEnabled(false)
    this.context.sketchPane.app.view.style.cursor = '-webkit-grab'
  }

  shutdown () {
    this.context.sketchPaneDOMElement.removeEventListener('pointerdown', this._onPointerDown)
    this.context.sketchPaneDOMElement.removeEventListener('pointermove', this._onPointerMove)
    this.context.sketchPaneDOMElement.removeEventListener('pointerup', this._onPointerUp)

    window.removeEventListener('blur', this._onWindowBlur)

    this.context.sketchPane.app.view.style.cursor = 'auto'
    this.context.sketchPane.cursor.setEnabled(true)
  }

  _onPointerDown (e) {
    this.state.dest.x = this.context.sketchPane.sketchPaneContainer.x
    this.state.dest.y = this.context.sketchPane.sketchPaneContainer.y
    this.state.starting = this.context.sketchPane.localizePoint(e)
    this.state.moved = false
    this.state.down = true
    this.context.sketchPaneDOMElement.addEventListener('pointermove', this._onPointerMove)
    this._updateCursor(e)
  }

  _onPointerMove (e) {
    this.state.position = this.context.sketchPane.localizePoint(e)

    // let z = this.context.sketchPane.zoom
    let z = this.context.sketchPane.sketchPaneContainer.scale.x

    this.state.dest.x += (this.state.position.x - this.state.starting.x) * z,
    this.state.dest.y += (this.state.position.y - this.state.starting.y) * z

    this.state.moved = true

    // render change
    this._render()

    this._updateCursor(e)
  }

  _onPointerUp (e) {
    this.state.down = false
    this.context.sketchPaneDOMElement.removeEventListener('pointermove', this._onPointerMove)
    this._updateCursor(e)
  }

  _updateCursor (e) {
    this.context.sketchPane.cursor.renderCursor(e)

    // be sure to takeover the cursor again
    this.context.sketchPane.app.view.style.cursor = this.state.down
      ? '-webkit-grabbing'
      : '-webkit-grab'
  }

  _onWindowBlur () {
    // attempt to gracefully transition back to drawing
    this.context.store.dispatch({ type: 'TOOLBAR_MODE_SET', payload: 'drawing', meta: { scope: 'local' } })
  }

  _render () {
    if (this.context.sketchPane.zoom <= 1) return

    // pan
    if (!this.context.sketchPane.anchor) {
      this.context.sketchPane.anchor = new PIXI.Point(
        this.context.sketchPane.sketchPaneContainer.x,
        this.context.sketchPane.sketchPaneContainer.y
      )
    }
    this.context.sketchPane.anchor.x = this.state.dest.x
    this.context.sketchPane.anchor.y = this.state.dest.y
    
    this.context.sketchPane.sketchPaneContainer.position.set(
      this.context.sketchPane.anchor.x,
      this.context.sketchPane.anchor.y
    )
  }
}

class FPSMeter {
  constructor () {
    this.onFrame = this.onFrame.bind(this)
    this.fpsList = []
    this.numToAvg = 4
  }
  start () {
    this.running = true
    this.startTime = window.performance.now()
    this.frames = 0

    this.onFrame()
  }
  onFrame () {
    if (this.running) {
      this.frames = this.frames + 1
      window.requestAnimationFrame(this.onFrame)
    }
  }
  stop () {
    if (this.running) {
      this.running = false
      let seconds = (window.performance.now() - this.startTime) / 1000
      this.fpsList.unshift(Math.round(this.frames / seconds))
      if (this.fpsList.length > this.numToAvg) { this.fpsList = this.fpsList.slice(0, this.numToAvg) }
    }
  }
  avg () {
    return this.fpsList.reduce((a, b) => a + b) / this.fpsList.length
  }
  hadLowFps (threshold = 20) {
    return this.fpsList.length === this.numToAvg && this.avg() <= threshold
  }
}

class IdleTimer {
  constructor (callback, delay = 500) {
    this.callback = callback
    this.delay = delay

    this.timer = null
  }
  reset () {
    clearTimeout(this.timer)
    this.timer = setTimeout(this.callback, this.delay)
  }
  clear () {
    clearTimeout(this.timer)
  }
}

module.exports = StoryboarderSketchPane
