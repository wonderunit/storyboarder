module.exports = class EyedropperStrategy {
  constructor (context) {
    this.context = context
    this.name = 'eyedropper'

    this._onPointerDown = this._onPointerDown.bind(this)
    this._onPointerMove = this._onPointerMove.bind(this)
    this._onPointerUp = this._onPointerUp.bind(this)

    this.state = {}
  }

  startup () {
    this.context.store.dispatch({ type: 'TOOLBAR_MODE_STATUS_SET', payload: 'busy', meta: { scope: 'local' } })

    this.context.sketchPaneDOMElement.addEventListener('pointerdown', this._onPointerDown)
    document.addEventListener('pointermove', this._onPointerMove)
    document.addEventListener('pointerup', this._onPointerUp)

    this.context.sketchPane.app.view.style.cursor = 'none'
    this.context.sketchPane.cursor.setEnabled(false)

    this.state = {}
    this.state.layer = this.context.sketchPane.layers.findByName('composite')
    this.state.preview = new PIXI.Sprite(PIXI.Texture.EMPTY)

    this._snapshot()

    // border
    let border = new PIXI.Graphics()
    border.lineStyle(2, 0xffffff)
    border.drawCircle(0, 0, 51)
    border.lineStyle(2, 0x000000)
    border.drawCircle(0, 0, 50)

    border.lineStyle(2, 0x000000)
    border.drawRect(-5, -5, 10, 10)

    // mask
    let mask = new PIXI.Graphics()
    mask.beginFill(0xff0000)
    mask.drawCircle(0, 0, 50)

    this.state.preview.addChild(this.state.sprite)
    this.state.preview.addChild(mask)
    this.state.sprite.mask = mask
    this.state.preview.addChild(border)

    this.state.layer.sprite.addChild(this.state.preview)
  }

  shutdown () {
    this.context.sketchPaneDOMElement.removeEventListener('pointerdown', this._onPointerDown)
    document.removeEventListener('pointermove', this._onPointerMove)
    document.removeEventListener('pointerup', this._onPointerUp)

    this.context.sketchPane.app.view.style.cursor = 'auto'
    this.context.sketchPane.cursor.setEnabled(false)

    this.state.layer.removeChild(this.state.preview)
    this.state.layer.clear()
    this.state = {}

    this.context.store.dispatch({ type: 'TOOLBAR_MODE_STATUS_SET', payload: 'idle', meta: { scope: 'local' } })
  }

  _snapshot () {
    let rt = this.context.sketchPane.layers.generateCompositeTexture(
      this.context.sketchPane.width,
      this.context.sketchPane.height,
      this.context.visibleLayersIndices,
      PIXI.RenderTexture.create(this.context.sketchPane.width, this.context.sketchPane.height)
    )
    let sprite = new PIXI.Sprite(PIXI.Texture.EMPTY)
    let matte = new PIXI.Graphics()
    matte.beginFill(0xffffff)
    matte.drawRect(0, 0, this.context.sketchPane.width, this.context.sketchPane.height)
    sprite.addChild(matte)
    sprite.addChild(new PIXI.Sprite(rt))
    let pixels = this.context.sketchPane.app.renderer.plugins.extract.pixels(sprite)

    // SketchPaneUtil.arrayPostDivide(pixels)

    this.state.sprite = sprite
    this.state.pixels = pixels
  }

  _onPointerDown (event) {
    this.state.down = true
    this._commit()
  }

  _onPointerMove (event) {
    let point = this.context.sketchPane.localizePoint(event)

    let index = (Math.floor(point.x) + Math.floor(point.y) * this.context.sketchPane.width) * 4

    let pixels = this.state.pixels
    if (index > 0 && index < pixels.length) {
      let r = pixels[index]
      let g = pixels[index + 1]
      let b = pixels[index + 2]
      let a = pixels[index + 3]
      let color = (r << 16) + (g << 8) + b
      let alpha = a / 255

      this.state.color = color
      this.state.alpha = alpha
    }

    // to change color only on drag
    // if (this.state.down) this._commit()

    // change color on every mouse move
    this._commit()

    this.state.preview.x = point.x
    this.state.preview.y = point.y

    let scale = 4
    this.state.sprite.scale.set(scale)
    this.state.sprite.x = 0 - (point.x * scale)
    this.state.sprite.y = 0 - (point.y * scale)
  }

  _onPointerUp (event) {
    this.state.down = false
  }

  _commit () {
    if (this.state.color !== null && this.state.alpha !== null) {
      let state = this.context.store.getState()
      this.context.store.dispatch({
         type: 'TOOLBAR_TOOL_SET',
         payload: {
           color: this.state.color,
           strokeOpacity: this.state.alpha
         }
       })
    }
  }

  _cancel () {
    // this.context.store.dispatch({ type: 'TOOLBAR_MODE_STATUS_SET', payload: 'idle', meta: { scope: 'local' } })
    this.context.store.dispatch({ type: 'TOOLBAR_MODE_SET', payload: 'drawing', meta: { scope: 'local' } })
  }
}
