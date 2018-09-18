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

    this.outlineSprite = this.context.sketchPane.selectedArea.asOutlineSprite()
    this.cutSprite = this.context.sketchPane.selectedArea.asSprite(this.context.visibleLayersIndices)
    this.context.sketchPane.selectedArea.clearLayers(this.context.visibleLayersIndices)
    // draw the outline
    this.layer.sprite.addChild(this.outlineSprite)
    // draw the cut sprite
    this.layer.sprite.addChild(this.cutSprite)
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
    this.state = {
      down: true,
      origin: this.context.sketchPane.localizePoint(event),
      position: this.context.sketchPane.localizePoint(event)
    }
  }

  _onPointerMove (event) {
    if (this.state.down) {
      this.state.position = this.context.sketchPane.localizePoint(event)
      this.context.sketchPane.selectedArea.target.x = this.state.position.x - this.state.origin.x
      this.context.sketchPane.selectedArea.target.y = this.state.position.y - this.state.origin.y
      this.draw()
    }
  }

  _onPointerUp (event) {
    this.state.down = false
  }

  _onKeyUp (event) {
    // TODO cancel via escape key
    // TODO commit via enter key
    console.log('key', event)
  }

  draw () {
    this.outlineSprite.x = this.context.sketchPane.selectedArea.target.x
    this.outlineSprite.y = this.context.sketchPane.selectedArea.target.y

    this.cutSprite.x = this.context.sketchPane.selectedArea.target.x
    this.cutSprite.y = this.context.sketchPane.selectedArea.target.y
  }
}

module.exports = MarqueeOperationStrategy
