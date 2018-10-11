const paper = require('paper')
const SketchPaneUtil = require('alchemancy').util

const constrainPoint = (point, rectangle) => {
  point = paper.Point.max(point, rectangle.topLeft)
  point = paper.Point.min(point, rectangle.bottomRight)
  return point
}

const getFillColor = state => state.toolbar.tools[state.toolbar.activeTool].color
const getFillAlpha = state => state.toolbar.tools[state.toolbar.activeTool].strokeOpacity

class MarqueeStrategy {
  constructor (context) {
    this.context = context
    this.name = 'marquee'

    this.strategies = {
      selection: new SelectionStrategy(this.context, this),
      operation: new OperationStrategy(this.context, this)
    }

    this.marqueeTransitionEvent = null
    this.marqueePath = null
  }

  startup () {
    console.log('MarqueeStrategy#startup')
    this.setStrategy('selection')
  }

  shutdown () {
    console.log('MarqueeStrategy#shutdown')
    if (this.strategy) {
      this.strategy.shutdown()
      this.strategy = null
    }
  }

  setStrategy (strategy) {
    if (this.strategy) this.strategy.shutdown()
    this.strategy = this.strategies[strategy]
    this.strategy.startup()
  }

  fakePointerDown (event) {
    if (this.strategy) {
      this.strategy._onPointerDown(event)
    }
  }

  findLayerByName (name) {
    return this.context.sketchPane.layers.findByName(name)
  }
}

class SelectionStrategy {
  constructor (context, parent) {
    this.context = context
    this.parent = parent

    this._onPointerDown = this._onPointerDown.bind(this)
    this._onPointerMove = this._onPointerMove.bind(this)
    this._onPointerUp = this._onPointerUp.bind(this)
    this._onKeyDown = this._onKeyDown.bind(this)
    this._onKeyUp = this._onKeyUp.bind(this)

    this._onWindowBlur = this._onWindowBlur.bind(this)

    this.offscreenCanvas = document.createElement('canvas')
    this.offscreenContext = this.offscreenCanvas.getContext('2d')

    this.paperScope = paper.setup(this.offscreenCanvas)
    this.paperScope.view.setAutoUpdate(false)
    this.paperScope.view.remove()
  }

  startup () {
    this.offscreenCanvas.width = this.context.sketchPane.width
    this.offscreenCanvas.height = this.context.sketchPane.height
    this.layer = this.context.sketchPane.layers.findByName('composite')

    this.state = {
      started: false,
      complete: false,
      selectionPath: null,
      selectionSubPath: null,
      draftPoint: null,
      straightLinePressed: false,
      isPointerDown: false,

      stateName: 'idle' // idle, freeform, line, add, subtract
    }

    document.addEventListener('pointerdown', this._onPointerDown)
    document.addEventListener('pointermove', this._onPointerMove)
    document.addEventListener('pointerup', this._onPointerUp)
    window.addEventListener('keydown', this._onKeyDown)
    window.addEventListener('keyup', this._onKeyUp)
    window.addEventListener('blur', this._onWindowBlur)

    this.context.sketchPane.cursor.setEnabled(false)
    this.context.sketchPane.app.view.style.cursor = 'crosshair'

    this.boundingRect = new paper.Rectangle(
      new paper.Point(0, 0),
      new paper.Point(this.context.sketchPane.width, this.context.sketchPane.height)
    )
  }

  shutdown () {
    this.boundingRect = null

    document.removeEventListener('pointerdown', this._onPointerDown)
    document.removeEventListener('pointermove', this._onPointerMove)
    document.removeEventListener('pointerup', this._onPointerUp)
    window.removeEventListener('keydown', this._onKeyDown)
    window.removeEventListener('keyup', this._onKeyUp)
    window.removeEventListener('blur', this._onWindowBlur)

    this.layer.clear()

    this.context.sketchPane.app.view.style.cursor = 'auto'
    this.context.sketchPane.cursor.setEnabled(true)
  }

  _isLineKeyPressed () {
    return this.context.isCommandPressed('drawing:marquee:straight-line')
  }

  _onPointerDown (event) {
    if (event.target.id === 'toolbar-marquee') return

    if (event.target !== this.context.sketchPaneDOMElement) {
      this.cancel()
      return
    }

    if (
      // not freeform/line/add/subtract
      this.state.stateName === 'idle' &&
      // has already drawn a marquee
      this.state.complete &&
      // pointerdown inside the marquee'd path(s)
      this._hit(event))
    {
      // transition to operating on the selection
      this.parent.marqueeTransitionEvent = event
      this._transitionNext()
      return
    }

    // if this is a new path
    if (!this.state.started) {
      this.context.store.dispatch({ type: 'TOOLBAR_MODE_STATUS_SET', payload: 'busy', meta: { scope: 'local' } })

      if (this.state.stateName === 'add') {
        this.state.selectionSubPath = new paper.Path()
        this.state.isPointerDown = true
        this._addPointFromEvent(event)
        this._draw()

      } else if (this.state.stateName === 'subtract') {
        this.state.selectionSubPath = new paper.Path()
        this.state.isPointerDown = true
        this._addPointFromEvent(event)
        this._draw()

      } else {
        // reset
        this.state.selectionPath = new paper.Path()

        // if the line key is pressed
        if (this._isLineKeyPressed()) {
          this.state.stateName = 'line'
        } else {
          this.state.stateName = 'freeform'
        }

        this.state = {
          ...this.state,
          started: true,
          complete: false,
          isPointerDown: true
        }

        this._addPointFromEvent(event)
        this._draw()

        if (this.state.stateName == 'line') {
          this.state.draftPoint = this.context.sketchPane.localizePoint(event)
        } else {
          this.state.draftPoint = null
        }
      }

      this.context.sketchPane.cursor.setEnabled(false)
      this.context.sketchPane.app.view.style.cursor = 'crosshair'
    }
  }

  _onPointerMove (event) {
    if (this.state.stateName === 'add' || this.state.stateName === 'subtract') {
      this.context.sketchPane.app.view.style.cursor = 'crosshair'

      if (this.state.isPointerDown) {
        this._addPointFromEvent(event)
        this._draw()
      }

    } else {
      if (this._hit(event) && !this.state.isPointerDown && this.state.selectionPath) {
        this.context.sketchPane.app.view.style.cursor = '-webkit-grab'
      } else {
        this.context.sketchPane.app.view.style.cursor = 'crosshair'
      }

      if (!this.state.started) return

      if (!this._isLineKeyPressed() && this.state.isPointerDown) {
        this.state.stateName = 'freeform'
      }

      if (this.state.stateName == 'line') {
        this.state.draftPoint = this.context.sketchPane.localizePoint(event)
      } else {
        this.state.draftPoint = null
        this._addPointFromEvent(event)
      }

      this._draw()
    }
  }

  _onPointerUp (event) {
    this.state.isPointerDown = false

    if (this.state.stateName === 'add' || this.state.stateName === 'subtract') {
      this._addPointFromEvent(event)
      this._endDrawnPath()

    } else {
      if (!this.state.started) return

      if (this._isLineKeyPressed()) {
        this.state.stateName = 'line'
      } else {
        this.state.stateName = 'freeform'
      }

      if (this.state.stateName == 'line') {
        this._addPointFromEvent(event)
        this._draw()
      } else {
        this._addPointFromEvent(event)

        this._endDrawnPath()
      }
    }
  }

  _endDrawnPath () {
    // close the active path
    let activePath = this._getActivePath()
    if (activePath.segments.length) {
      activePath.add(
        constrainPoint(
          activePath.segments[0].point.clone(),
          this.boundingRect
        )
      )
    }

    // avoid self-intersections
    activePath = activePath.unite(this.state.selectionPath)
    if (!activePath.children) {
      if (activePath.segments.length) {
        constrainPoint(
          activePath.add(activePath.segments[0].point.clone()),
          this.boundingRect
        )
      }
    }
    activePath.closePath()

    // selectionPath is now the combined path
    this.state.selectionPath = this._getCombinedPath()
    // clear the sub path
    this.state.selectionSubPath = null

    this.state.started = false
    this.state.complete = true
    this.state.draftPoint = null

    this._draw()

    this.parent.marqueePath = this.state.selectionPath.clone()
    this.state.stateName = 'idle'
  }

  _hit (event) {
    if (!this.state.selectionPath) return false

    let point = this.context.sketchPane.localizePoint(event)
    return this._getCombinedPath().contains(point)
  }

  _transitionNext () {
    this.context.store.dispatch({
      type: 'TOOLBAR_MODE_STATUS_SET', payload: 'idle', meta: { scope: 'local' }
    })

    this.parent.setStrategy('operation')
  }

  _addPointFromEvent (event) {
    let point = this.context.sketchPane.localizePoint(event)

    this._getActivePath().add(
      constrainPoint(new paper.Point(point.x, point.y), this.boundingRect)
    )
  }

  _getActivePath () {
    return (this.state.stateName === 'add' || this.state.stateName === 'subtract')
      ? this.state.selectionSubPath
      : this.state.selectionPath
  }

  _getCombinedPath () {
    let result
    if (this.state.stateName === 'add') {
      result = this.state.selectionPath.clone().unite(this.state.selectionSubPath, { insert: false })

    } else if (this.state.stateName === 'subtract') {
      result = this.state.selectionPath.clone().subtract(this.state.selectionSubPath, { insert: false })

    } else {
      result = this.state.selectionPath.clone()

    }

    return result
  }

  _onWindowBlur () {
    // this.cancel()
  }

  _onKeyDown (event) {
    event.preventDefault()

    if (this.state.complete) {
      if (this.context.isCommandPressed('drawing:marquee:add')) {
        this.state.stateName = 'add'
        // this.context.sketchPane.app.view.style.cursor = 'zoom-in'
      }
      if (this.context.isCommandPressed('drawing:marquee:subtract')) {
        this.state.stateName = 'subtract'
        // this.context.sketchPane.app.view.style.cursor = 'zoom-out'
      }
    }

    if (this.context.isCommandPressed('drawing:marquee:cancel')) {
      this.cancel()
    }

    if (this.context.isCommandPressed('drawing:marquee:erase')) {
      if (this.state.complete && this.parent.marqueePath) {
        let indices = this.context.visibleLayersIndices
        this.context.emit('addToUndoStack', indices)
        this.context.sketchPane.selectedArea.set(this.parent.marqueePath)
        this.context.sketchPane.selectedArea.erase(indices)
        this.context.sketchPane.selectedArea.unset()
        this.context.emit('markDirty', indices)
        this.deselect()
      }
    }

    if (this.context.isCommandPressed('drawing:marquee:fill')) {
      if (this.state.complete && this.parent.marqueePath) {
        // let indices = this.context.visibleLayersIndices
        let indices = [this.parent.findLayerByName('fill').index]
        let state = this.context.store.getState()
        let color = getFillColor(state)
        let alpha = getFillAlpha(state)
        this.context.emit('addToUndoStack', indices)
        this.context.sketchPane.selectedArea.set(this.parent.marqueePath)
        this.context.sketchPane.selectedArea.fill(indices, color, alpha)
        this.context.sketchPane.selectedArea.unset()
        this.context.emit('markDirty', indices)
        this.deselect()
      }
    }
  }

  _onKeyUp (event) {
    event.preventDefault()

    if (this.state.complete) {
      if (this.state.stateName === 'add' && !this.context.isCommandPressed('drawing:marquee:add')) {
        this.state.stateName = 'freeform'
        this.context.sketchPane.app.view.style.cursor = 'crosshair'
      }
      if (this.state.stateName === 'subtract' && !this.context.isCommandPressed('drawing:marquee:subtract')) {
        this.state.stateName = 'freeform'
        this.context.sketchPane.app.view.style.cursor = 'crosshair'
      }
    }

    if (!this._isLineKeyPressed()) {
      if (this.state.started && this.state.stateName == 'line' && !this.state.isPointerDown) {
        this._endDrawnPath()
      }
    }
  }

  cancel () {
    // attempt to gracefully transition back to drawing
    this.context.store.dispatch({
      type: 'TOOLBAR_MODE_STATUS_SET', payload: 'idle', meta: { scope: 'local' }
    })
    this.context.store.dispatch({ type: 'TOOLBAR_MODE_SET', payload: 'drawing', meta: { scope: 'local' } })
  }

  deselect () {
    this.context.store.dispatch({ type: 'TOOLBAR_MODE_STATUS_SET', payload: 'idle', meta: { scope: 'local' } })

    this.layer.clear()

    this.parent.marqueePath = null
    this.state.stateName = 'idle'

    this.state.selectionPath = new paper.Path()
    this.state.selectionSubPath = null

    this.state.started = false
    this.state.complete = false
    this.state.draftPoint = null
    this.state.isPointerDown = false

    this._draw()
  }

  _draw () {
    let ctx = this.offscreenContext

    ctx.clearRect(0, 0, this.context.sketchPane.width, this.context.sketchPane.height)
    ctx.globalAlpha = 1.0

    let pathToDraw = this._getCombinedPath()

    let children = pathToDraw.children || [pathToDraw]

    for (let n = 0; n < children.length; n++) {
      let child = children[n]

      let pointsToDraw = child.segments.map(segment => ({ x: segment.point.x, y: segment.point.y }))

      // draft point added to last child
      if (this.state.draftPoint != null) {
        if (n === children.length - 1) {
          pointsToDraw.push(this.state.draftPoint)
        }
      }

      if (pointsToDraw.length) {
        ctx.save()

        // white
        ctx.lineWidth = 1
        ctx.strokeStyle = '#fff'
        ctx.setLineDash([])
        ctx.moveTo(pointsToDraw[0].x, pointsToDraw[0].y)
        ctx.beginPath()
        for (let i = 0; i < pointsToDraw.length; i++) {
          let point = pointsToDraw[i]
          ctx.lineTo(point.x, point.y)
        }
        ctx.closePath()
        ctx.stroke()

        // purple
        ctx.lineWidth = 1
        ctx.strokeStyle = '#6A4DE7'
        ctx.setLineDash([2, 5])
        ctx.moveTo(pointsToDraw[0].x, pointsToDraw[0].y)
        ctx.beginPath()
        for (let i = 0; i < pointsToDraw.length; i++) {
          let point = pointsToDraw[i]
          ctx.lineTo(point.x, point.y)
        }
        ctx.closePath()
        ctx.stroke()

        ctx.restore()

        // diagnostic circles:
        //
        // for (let j = 0; j < pointsToDraw.length; j++) {
        //   let point = pointsToDraw[j]
        //   ctx.beginPath()
        //   ctx.arc(point.x, point.y, 10, 0, Math.PI * 2)
        //   ctx.fillStyle = '#f00'
        //   ctx.fill()
        // }
      }
    }

    this.layer.replaceTextureFromCanvas(this.offscreenCanvas)
  }
}

class OperationStrategy {
  constructor (context, parent) {
    this.context = context
    this.parent = parent

    this._onPointerDown = this._onPointerDown.bind(this)
    this._onPointerMove = this._onPointerMove.bind(this)
    this._onPointerUp = this._onPointerUp.bind(this)
    this._onKeyDown = this._onKeyDown.bind(this)
    this._onKeyUp = this._onKeyUp.bind(this)
  }

  startup () {
    console.log('OperationStrategy#startup')

    this.layer = this.context.sketchPane.layers.findByName('composite')
    this.backgroundMatte = null

    this.context.store.dispatch({ type: 'TOOLBAR_MODE_STATUS_SET', payload: 'busy', meta: { scope: 'local' } })

    this.state = {
      marqueePath: this.parent.marqueePath.clone(),
      moved: false,
      done: false,
      commitOperation: 'move' // move, fill
    }
    this.state.target = {
      x: this.state.marqueePath.bounds.x,
      y: this.state.marqueePath.bounds.y
    }

    this.context.sketchPane.selectedArea.set(this.state.marqueePath)

    // delete ALL cached canvas textures to ensure canvas is re-rendered
    PIXI.utils.clearTextureCache()

    this.outlineSprite = this.context.sketchPane.selectedArea.asOutlineSprite()
    this.cutSprite = this.context.sketchPane.selectedArea.asSprite(this.context.visibleLayersIndices)
    this.areaPolygons = this.context.sketchPane.selectedArea.asPolygons(false)

    // TODO should this move to a SelectedArea setup/prepare method?

    // solid background
    this.backgroundMatte = new PIXI.Graphics()
    this.backgroundMatte.beginFill(0xffffff)
    // draw a rectangle
    this.backgroundMatte.drawRect(0, 0, this.context.sketchPane.width, this.context.sketchPane.height)
    this.layer.sprite.addChild(this.backgroundMatte)

    let maskSprite = this.context.sketchPane.selectedArea.asMaskSprite(true)
    this.flattenedLayerSprite = new PIXI.Sprite(
      PIXI.Texture.fromCanvas(
        this.context.sketchPane.layers.asFlattenedCanvas(
          this.context.sketchPane.width,
          this.context.sketchPane.height,
          this.context.visibleLayersIndices
        )
      )
    )
    this.flattenedLayerSprite.addChild(maskSprite)
    this.flattenedLayerSprite.mask = maskSprite

    this.layer.sprite.addChild(this.flattenedLayerSprite)

    // draw the cut sprite
    this.layer.sprite.addChild(this.cutSprite)

    // draw the outline
    this.layer.sprite.addChild(this.outlineSprite)

    // positioning
    this.draw()
    
    document.addEventListener('pointerdown', this._onPointerDown)
    document.addEventListener('pointermove', this._onPointerMove)
    document.addEventListener('pointerup', this._onPointerUp)
    window.addEventListener('keydown', this._onKeyDown)
    window.addEventListener('keyup', this._onKeyUp)

    // HACK force the first pointer down
    this._onPointerDown(this.parent.marqueeTransitionEvent)

    this.context.sketchPane.cursor.setEnabled(false)
    this.context.sketchPane.app.view.style.cursor = 'auto'
  }

  shutdown () {
    if (!this.state.done) {
      this.cleanup()
      this.state.done = true
    }

    document.removeEventListener('pointerdown', this._onPointerDown)
    document.removeEventListener('pointermove', this._onPointerMove)
    document.removeEventListener('pointerup', this._onPointerUp)
    window.removeEventListener('keydown', this._onKeyDown)
    window.removeEventListener('keyup', this._onKeyUp)

    this.context.sketchPane.app.view.style.cursor = 'auto'
    this.context.sketchPane.cursor.setEnabled(true)
  }

  hit (polygons, point) {
    for (let polygon of polygons) {
      if (polygon.contains(point.x, point.y)) {
        return true
      }
    }
    return false
  }

  _onPointerDown (event) {
    if (event.target !== this.context.sketchPaneDOMElement) {
      this.cancel()
      return
    }

    let point = this.context.sketchPane.localizePoint(event)
    this.state = {
      ...this.state,
      done: false,
      hitAreaPolygons: this.areaPolygons.map(polygon => polygon.clone())
    }

    // was it outside?
    if (!this.hit(this.state.hitAreaPolygons, point)) {
      this.commit()

      // NOTE this works because OperationStrategy instance stays in memory after shutdown
      this.parent.fakePointerDown(event)
      return
    }

    this.state = {
      ...this.state,
      down: true,
      spriteOrigin: { x: this.cutSprite.x, y: this.cutSprite.y },
      origin: { x: point.x, y: point.y },
      position: { x: point.x, y: point.y }
    }

    this.updateCursor(event)
  }

  _onPointerMove (event) {
    let point = this.context.sketchPane.localizePoint(event)

    if (this.state.down) {
      this.state.position = point
      this.state.target.x = this.state.spriteOrigin.x + (this.state.position.x - this.state.origin.x)
      this.state.target.y = this.state.spriteOrigin.y + (this.state.position.y - this.state.origin.y)

      this.state.moved = (
        this.state.target.x != this.state.marqueePath.bounds.x ||
        this.state.target.x != this.state.marqueePath.bounds.y
      )

      this.draw()
    }
    this.updateCursor(event)
  }

  _onPointerUp (event) {
    this.state.down = false

    this.areaPolygons = this.state.hitAreaPolygons.map(polygon => polygon.clone())

    this.updateCursor(event)
  }

  _onKeyDown (event) {
    event.preventDefault()

    if (this.context.isCommandPressed('drawing:marquee:cancel')) {
      this.cancel()
      return
    }

    if (this.context.isCommandPressed('drawing:marquee:commit')) {
      this.commit()
      return
    }

    if (this.context.isCommandPressed('drawing:marquee:erase')) {
      // we'll be doing an erase
      this.state.commitOperation = 'erase'
      // erase the cutout contents
      this.cutSprite.texture.destroy()
      this.cutSprite.texture = this.context.sketchPane.selectedArea.asFilledTexture(0xffffff, 0.0)
      this.cutSprite.alpha = 1.0
      return
    }

    if (this.context.isCommandPressed('drawing:marquee:fill')) {
      // setup a live preview of the fill

      // we'll be doing a fill when we commit
      this.state.commitOperation = 'fill'

      // clear existing cut sprite
      this.cutSprite.removeChildren()
      this.cutSprite.texture.destroy()
      this.cutSprite.texture = this.context.sketchPane.selectedArea.asFilledTexture(0xffffff, 0.0)

      let fillLayer = this.parent.findLayerByName('fill')

      let indices = this.context.visibleLayersIndices

      // all layer indexes _except_ for the fill layer
      let filtered = indices.filter(n => n != fillLayer.index)
      // associative array of layer index -> Sprite cutout
      let sprites = this.context.sketchPane.selectedArea.copy(filtered)

      // `fill` layer cutout sprite
      let state = this.context.store.getState()
      let color = getFillColor(state)
      let alpha = getFillAlpha(state)
      let texture = this.context.sketchPane.selectedArea.asFilledTexture(color, alpha)
      let sprite = new PIXI.Sprite(texture)
      // add the `fill` layer cutout sprite back in
      sprites[fillLayer.index] = sprite

      for (let index of indices) {
        this.cutSprite.addChild(sprites[index])
      }
    }
  }

  _onKeyUp (event) {
    event.preventDefault()
  }

  cleanup () {
    this.layer.sprite.removeChild(this.backgroundMatte)
    this.layer.sprite.removeChild(this.flattenedLayerSprite)
    this.layer.sprite.removeChild(this.outlineSprite)
    this.cutSprite.removeChildren()
    this.layer.sprite.removeChild(this.cutSprite)
    this.layer.clear()

    this.parent.marqueePath = null
  }

  complete () {
    this.cleanup()

    this.context.store.dispatch({
      type: 'TOOLBAR_MODE_STATUS_SET', payload: 'idle', meta: { scope: 'local' }
    })

    this.parent.setStrategy('selection')
  }

  cancel () {
    this.state.done = true
    this.complete()
  }

  commit () {
    this.state.done = true

    if (this.state.moved) {
      let indices = this.context.visibleLayersIndices

      if (this.state.commitOperation === 'move') {
        this.context.emit('addToUndoStack', indices)
        let sprites = this.context.sketchPane.selectedArea.copy(indices)
        sprites.forEach(sprite => {
          sprite.x = this.state.target.x
          sprite.y = this.state.target.y
        })
        this.context.sketchPane.selectedArea.erase(indices)
        this.context.sketchPane.selectedArea.paste(indices, sprites)
        this.context.emit('markDirty', indices)

      } else if (this.state.commitOperation === 'erase') {
        this.context.emit('addToUndoStack', indices)
        this.context.sketchPane.selectedArea.erase(indices)
        this.context.emit('markDirty', indices)

      } else if (this.state.commitOperation === 'fill') {
        let fillLayer = this.parent.findLayerByName('fill')

        // all layer indexes _except_ for the fill layer
        let filtered = indices.filter(n => n != fillLayer.index)
        // associative array of layer index -> Sprite cutout
        let sprites = this.context.sketchPane.selectedArea.copy(filtered)

        // `fill` layer cutout sprite
        let state = this.context.store.getState()
        let color = getFillColor(state)
        let alpha = getFillAlpha(state)
        let texture = this.context.sketchPane.selectedArea.asFilledTexture(color, alpha)
        let sprite = new PIXI.Sprite(texture)
        // add the `fill` layer cutout sprite back in
        sprites[fillLayer.index] = sprite

        // set the position of all cutout sprites
        sprites.forEach(sprite => {
          sprite.x = this.state.target.x
          sprite.y = this.state.target.y
        })

        this.context.emit('addToUndoStack', indices)
        this.context.sketchPane.selectedArea.erase(indices)
        this.context.sketchPane.selectedArea.paste(indices, sprites)
        this.context.emit('markDirty', indices)
      }
    }

    this.complete()
  }

  draw () {
    this.outlineSprite.x = this.state.target.x
    this.outlineSprite.y = this.state.target.y

    this.cutSprite.x = this.state.target.x
    this.cutSprite.y = this.state.target.y

    if (this.state.hitAreaPolygons) {
      // translate area polygons
      for (let i = 0; i < this.state.hitAreaPolygons.length; i++) {
        for (let j = 0; j < this.state.hitAreaPolygons[i].points.length; j += 2) {
          let offsetX = this.state.target.x - this.state.spriteOrigin.x
          let offsetY = this.state.target.y - this.state.spriteOrigin.y
          this.state.hitAreaPolygons[i].points[j + 0] = this.areaPolygons[i].points[j + 0] + offsetX
          this.state.hitAreaPolygons[i].points[j + 1] = this.areaPolygons[i].points[j + 1] + offsetY
        }
      }
    }
  }

  updateCursor (event) {
    let point = this.context.sketchPane.localizePoint(event)
    // set cursor
    if (this.state.hitAreaPolygons && this.hit(this.state.hitAreaPolygons, point)) {
      if (this.state.down) {
        this.context.sketchPane.app.view.style.cursor = '-webkit-grabbing'
      } else {
        this.context.sketchPane.app.view.style.cursor = '-webkit-grab'
      }
    } else {
      if (event.target == this.context.sketchPaneDOMElement) {
        this.context.sketchPane.app.view.style.cursor = 'crosshair'
      } else {
        this.context.sketchPane.app.view.style.cursor = 'auto'
      }
    }
  }
}

module.exports = MarqueeStrategy
