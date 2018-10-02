const SketchPaneUtil = require('alchemancy').util

class MarqueeOperationStrategy {
  constructor (context) {
    this.context = context
    this.name = 'marqueeOperation'

    this.layer = this.context.sketchPane.layers.findByName('composite')

    this._onPointerDown = this._onPointerDown.bind(this)
    this._onPointerMove = this._onPointerMove.bind(this)
    this._onPointerUp = this._onPointerUp.bind(this)
    this._onKeyDown = this._onKeyDown.bind(this)
    this._onKeyUp = this._onKeyUp.bind(this)

    this.backgroundMatte = null
  }

  startup () {
    console.log('MarqueeOperationStrategy#startup')

    this.context.store.dispatch({ type: 'TOOLBAR_MODE_STATUS_SET', payload: 'busy', meta: { scope: 'local' } })

    this.state = {
      marqueePath: this.context.marqueePath.clone(),
      moved: false,
      done: false
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
    this._onPointerDown(this.context.marqueeTransitionEvent)

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
    }
    if (this.context.isCommandPressed('drawing:marquee:commit')) {
      this.commit()
    }
  }

  _onKeyUp (event) {
    event.preventDefault()
  }

  cleanup () {
    this.layer.sprite.removeChild(this.backgroundMatte)
    this.layer.sprite.removeChild(this.flattenedLayerSprite)
    this.layer.sprite.removeChild(this.outlineSprite)
    this.layer.sprite.removeChild(this.cutSprite)
    this.layer.clear()

    this.context.marqueePath = null
  }

  complete () {
    this.cleanup()

    this.context.store.dispatch({
      type: 'TOOLBAR_MODE_STATUS_SET', payload: 'idle', meta: { scope: 'local' }
    })
    this.context.store.dispatch({
      type: 'TOOLBAR_MODE_SET', payload: 'marqueeSelection', meta: { scope: 'local' }
    })
  }

  cancel () {
    this.state.done = true
    this.complete()
  }

  commit () {
    this.state.done = true

    if (this.state.moved) {
      let indices = this.context.visibleLayersIndices

      this.context.emit('addToUndoStack', indices)
      let sprites = this.context.sketchPane.selectedArea.copy(indices)
      sprites.forEach(sprite => {
        sprite.x = this.state.target.x
        sprite.y = this.state.target.y
      })
      this.context.sketchPane.selectedArea.erase(indices)
      this.context.sketchPane.selectedArea.paste(indices, sprites)
      this.context.emit('markDirty', indices)
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
      this.context.sketchPane.app.view.style.cursor = 'auto'
    }
  }
}

module.exports = MarqueeOperationStrategy
