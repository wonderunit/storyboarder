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
      done: false
    }

    this.context.sketchPane.selectedArea.set(this.state.marqueePath)
    this.context.sketchPane.selectedArea.target = {
      x: this.state.marqueePath.bounds.x,
      y: this.state.marqueePath.bounds.y
    }

    // delete ALL cached canvas textures to ensure canvas is re-rendered
    PIXI.utils.clearTextureCache()

    this.outlineSprite = this.context.sketchPane.selectedArea.asOutlineSprite()
    this.cutSprite = this.context.sketchPane.selectedArea.asSprite(this.context.visibleLayersIndices)

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
  }

  _onPointerDown (event) {
    if (event.target !== this.context.sketchPaneDOMElement) {
      this.cancel()
      return
    }

    let point = this.context.sketchPane.localizePoint(event)
    this.state = {
      down: true,
      spriteOrigin: { x: this.cutSprite.x, y: this.cutSprite.y },
      origin: { x: point.x, y: point.y },
      position: { x: point.x, y: point.y }
    }
  }

  _onPointerMove (event) {
    if (this.state.down) {
      this.state.position = this.context.sketchPane.localizePoint(event)
      this.context.sketchPane.selectedArea.target.x = this.state.spriteOrigin.x + (this.state.position.x - this.state.origin.x)
      this.context.sketchPane.selectedArea.target.y = this.state.spriteOrigin.y + (this.state.position.y - this.state.origin.y)
      this.draw()
    }
  }

  _onPointerUp (event) {
    this.state.down = false
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
      type: 'TOOLBAR_MODE_SET', payload: 'drawing', meta: { scope: 'local' }
    })
  }

  cancel () {
    this.state.done = true
    this.complete()
  }

  commit () {
    this.state.done = true

    let indices = this.context.visibleLayersIndices

    this.context.emit('addToUndoStack', indices)
    let sprites = this.context.sketchPane.selectedArea.copy(indices)
    this.context.sketchPane.selectedArea.erase(indices)
    this.context.sketchPane.selectedArea.paste(indices, sprites)
    this.context.emit('markDirty', indices)

    this.complete()
  }

  draw () {
    this.outlineSprite.x = this.context.sketchPane.selectedArea.target.x
    this.outlineSprite.y = this.context.sketchPane.selectedArea.target.y

    this.cutSprite.x = this.context.sketchPane.selectedArea.target.x
    this.cutSprite.y = this.context.sketchPane.selectedArea.target.y
  }
}

module.exports = MarqueeOperationStrategy
