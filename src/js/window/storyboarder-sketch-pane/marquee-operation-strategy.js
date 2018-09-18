const SketchPaneUtil = require('alchemancy').util

class MarqueeOperationStrategy {
  constructor (context) {
    this.context = context
    this.name = 'marqueeOperation'

    this.layer = this.context.sketchPane.layers.findByName('composite')

    this._onPointerDown = this._onPointerDown.bind(this)
    this._onPointerMove = this._onPointerMove.bind(this)
    this._onPointerUp = this._onPointerUp.bind(this)
    this._onKeyUp = this._onKeyUp.bind(this)
  }

  startup () {
    console.log('MarqueeOperationStrategy#startup')

    this.context.store.dispatch({ type: 'TOOLBAR_MODE_STATUS_SET', payload: 'busy', meta: { scope: 'local' } })

    this.state = {
      marqueePath: this.context.marqueePath.clone()
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
    this.bgGraphics = new PIXI.Graphics()
    this.bgGraphics.beginFill(0xffffff)
    // draw a rectangle
    this.bgGraphics.drawRect(0, 0, this.context.sketchPane.width, this.context.sketchPane.height)
    this.layer.sprite.addChild(this.bgGraphics)

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
    
    this.context.sketchPaneDOMElement.addEventListener('pointerdown', this._onPointerDown)
    document.addEventListener('pointermove', this._onPointerMove)
    document.addEventListener('pointerup', this._onPointerUp)
    window.addEventListener('keyup', this._onKeyUp)
  }

  shutdown () {
    this.context.sketchPaneDOMElement.removeEventListener('pointerdown', this._onPointerDown)
    document.removeEventListener('pointermove', this._onPointerMove)
    document.removeEventListener('pointerup', this._onPointerUp)
    window.removeEventListener('keyup', this._onKeyUp)
  }

  _onPointerDown (event) {
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

  _onKeyUp (event) {
    // TODO key map
    if (event.key === 'Escape') {
      this.cancel()
    }

    // TODO key map
    if (event.key === 'Enter') {
      this.commit()
    }
  }

  complete () {
    this.layer.sprite.removeChild(this.bgGraphics)
    this.layer.sprite.removeChild(this.flattenedLayerSprite)
    this.layer.sprite.removeChild(this.outlineSprite)
    this.layer.sprite.removeChild(this.cutSprite)
    this.layer.clear()

    this.context.marqueePath = null

    this.context.store.dispatch({
      type: 'TOOLBAR_MODE_STATUS_SET', payload: 'idle', meta: { scope: 'local' }
    })
    this.context.store.dispatch({
      type: 'TOOLBAR_MODE_SET', payload: 'marqueeOperation', meta: { scope: 'local' }
    })
  }

  cancel () {
    this.complete()
  }

  commit () {
    // cut + paste each layer
    let inverseMask = this.context.sketchPane.selectedArea.asMaskSprite(true)
    for (let i of this.context.visibleLayersIndices) {
      // TODO this results in two rewrites, can it be simplified?

      let layer = this.context.sketchPane.layers[i]

      // cut & rewrite
      layer.applyMask(inverseMask)

      // paste & rewrite
      layer.sprite.addChild(this.cutSprite)
      layer.rewrite()
      layer.sprite.removeChild(this.cutSprite)

      layer.setDirty(true)
    }

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
