const { getFillColor, getFillAlpha } = require('./selectors')

module.exports = class OperationStrategy {
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
    document.addEventListener('pointerdown', this._onPointerDown)
    document.addEventListener('pointermove', this._onPointerMove)
    document.addEventListener('pointerup', this._onPointerUp)
    window.addEventListener('keydown', this._onKeyDown)
    window.addEventListener('keyup', this._onKeyUp)

    this.layer = this.context.sketchPane.layers.findByName('composite')
    this.backgroundMatte = null

    this.context.store.dispatch({ type: 'TOOLBAR_MODE_STATUS_SET', payload: 'busy', meta: { scope: 'local' } })
  }

  fromClipboard (contents) {
    try {
      this.parent.marqueePath = new paper.Path().importJSON(contents.marquee.path)
  
      this.state = {
        marqueePath: this.parent.marqueePath.clone(),
        moved: false,
        done: false,
        commitOperation: 'paste'
      }
      this.state.target = {
        x: this.state.marqueePath.bounds.x,
        y: this.state.marqueePath.bounds.y
      }
      this.context.sketchPane.selectedArea.set(this.state.marqueePath)
      // delete ALL cached canvas textures to ensure canvas is re-rendered
      PIXI.utils.clearTextureCache()
  
      this.cutSprite = new PIXI.Sprite(PIXI.Texture.EMPTY)
  
      Promise.all(
        Object.entries(contents.imageDataByLayerId).map(([name, data]) =>
          new Promise((resolve, reject) => {
            let texture = PIXI.Texture.fromImage(data)
            texture.baseTexture.once('loaded', () => {
              resolve({ name, texture })
            })
            // TODO does this need to be cleaned up?
            texture.baseTexture.once('error', () => {
              reject(err)
            })
          })
        )
      ).then(pairs => {
        this.cutSprite = new PIXI.Sprite(PIXI.Texture.EMPTY)
        for (let { name, texture } of pairs) {
          let sprite = new PIXI.Sprite(texture)
          sprite.name = name
          this.cutSprite.addChild(sprite)
        }
  
        this.setupOperation()
      }).catch(err => {
        console.error(err)
        throw err
      })
    } catch (err) {
      console.error(err)
      alert('Whoops! Couldn’t paste.')
    }
  }

  fromSelection () {
    this.state = {
      marqueePath: this.parent.marqueePath.clone(),
      moved: false,
      done: false,
      commitOperation: 'move' // move, fill, paste
    }
    this.state.target = {
      x: this.state.marqueePath.bounds.x,
      y: this.state.marqueePath.bounds.y
    }

    this.context.sketchPane.selectedArea.set(this.state.marqueePath)

    // delete ALL cached canvas textures to ensure canvas is re-rendered
    PIXI.utils.clearTextureCache()

    this.cutSprite = this.context.sketchPane.selectedArea.asSprite(this.context.visibleLayersIndices)

    this.setupOperation()

    let maskSprite = this.context.sketchPane.selectedArea.asMaskSprite(true)
    this.flattenedLayerSprite.addChild(maskSprite)
    this.flattenedLayerSprite.mask = maskSprite

    // HACK force the first pointer down
    this._onPointerDown(this.parent.marqueeTransitionEvent)
  }

  setupOperation () {
    this.outlineSprite = this.context.sketchPane.selectedArea.asOutlineSprite()
    this.areaPolygons = this.context.sketchPane.selectedArea.asPolygons(false)

    // TODO should this move to a SelectedArea setup/prepare method?

    // solid background
    this.backgroundMatte = new PIXI.Graphics()
    this.backgroundMatte.beginFill(0xffffff)
    // draw a rectangle
    this.backgroundMatte.drawRect(0, 0, this.context.sketchPane.width, this.context.sketchPane.height)
    this.layer.sprite.addChild(this.backgroundMatte)

    this.flattenedLayerSprite = new PIXI.Sprite(
      PIXI.Texture.fromCanvas(
        this.context.sketchPane.layers.asFlattenedCanvas(
          this.context.sketchPane.width,
          this.context.sketchPane.height,
          this.context.visibleLayersIndices
        )
      )
    )

    this.layer.sprite.addChild(this.flattenedLayerSprite)

    // draw the cut sprite
    this.layer.sprite.addChild(this.cutSprite)

    // draw the outline
    this.layer.sprite.addChild(this.outlineSprite)

    // positioning
    this.draw()

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
      this.state.target.x = Math.round(this.state.spriteOrigin.x + (this.state.position.x - this.state.origin.x))
      this.state.target.y = Math.round(this.state.spriteOrigin.y + (this.state.position.y - this.state.origin.y))

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
    // TODO key bindings
    if (event.key === 'v' && (event.metaKey || event.ctrlKey)) {
      // commit first
      this.commit()
      // allow paste command through
      return
    } else {
      event.preventDefault()
    }

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
      this.cutSprite.texture = PIXI.Texture.EMPTY

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

    if (
      // have we moved the artwork at all?
      this.state.moved ||
      // or, was it pasted, so we have to operate even if not moved?
      this.state.commitOperation === 'paste'
    ) {
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

      } else if (this.state.commitOperation === 'paste') {
        this.context.emit('addToUndoStack', indices)

        // look for layers in the clipboard that match layers we have by id
        // add any matches to the paste-able sprites list
        let indexes = []
        let sprites = []
        for (let sprite of this.cutSprite.children) {
          let layer = this.context.sketchPane.layers.findByName(sprite.name)
          if (layer) {
            indexes.push(layer.index)
            sprites[layer.index] = sprite
          } else {
            console.log('ignoring layer with name', sprite.name)
          }
        }
        // move the sprites
        sprites.forEach(sprite => {
          sprite.x = this.state.target.x
          sprite.y = this.state.target.y
        })

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
