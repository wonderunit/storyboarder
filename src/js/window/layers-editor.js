const EventEmitter = require('events').EventEmitter

const { DEFAULT_REFERENCE_LAYER_OPACITY } = require('../exporters/common')

class LayersEditor extends EventEmitter {
  constructor (storyboarderSketchPane, sfx, notifications) {
    super()
    this.storyboarderSketchPane = storyboarderSketchPane
    this.sfx = sfx
    this.notifications = notifications

    this.model = {
      layers: {
        [this.storyboarderSketchPane.sketchPane.layers.findByName('reference').index]: {
          opacity: DEFAULT_REFERENCE_LAYER_OPACITY
        }
      }
    }

    // document.querySelector('.layers-ui-notes-visible').addEventListener('pointerdown', this.toggleLayer.bind(this, 3))
    document
      .querySelector('.layers-ui-notes-clear')
      .addEventListener('click', () => {
        this.clearLayer(3)
        sfx.down(-1, 2)
        sfx.playEffect('trash')
        notifications.notify({ message: 'Cleared notes layer.', timing: 5 })
      })
    document
      .querySelector('.layers-ui-reference-clear')
      .addEventListener('click', event => {
        event.preventDefault()
        this.clearLayer(0)
        sfx.down(-1, 0)
        sfx.playEffect('trash')
        notifications.notify({ message: 'Cleared light layer.', timing: 5 })
      })
    // document.querySelector('.layers-ui-main-visible').addEventListener('pointerdown', this.toggleLayer.bind(this, 1))
    document
      .querySelector('.layers-ui-fill-merge')
      .addEventListener('click', event => {
        event.preventDefault()
        this.mergeDown()
        sfx.negative()
        notifications.notify({
          message:
            'Merged the fill layer down to the reference layer. If this is not what you want, undo now!',
          timing: 5
        })
      })
    // document.querySelector('.layers-ui-reference-visible').addEventListener('pointerdown', this.toggleLayer.bind(this, 0))
    document
      .querySelector('.layers-ui-reference-merge')
      .addEventListener('click', () => {
        this.mergeUp()
        sfx.negative()
        notifications.notify({
          message:
            'Merged the light layer up to the fill layer. The light layer is now baked into the fill layer. If this is not what you want, undo now!',
          timing: 5
        })
      })

    document
      .querySelector('.layers-ui-reference-opacity')
      .addEventListener('input', event => {
        event.preventDefault()
        this.setReferenceOpacity(event.target.value / 100)
      })

    this.render(this.model)
  }

  // NOT USED
  //
  // toggleLayer (index) {
  //   event.preventDefault()
  //   this.present({ opacity: { index: this.storyboarderSketchPane.sketchPane.layers.findByName('reference').index, toggle: true })
  // }

  clearLayer (index) {
    if (this.storyboarderSketchPane.preventIfLocked()) return

    this.storyboarderSketchPane.clearLayers([index])
  }

  // merge `fill` and `reference` and draw to `reference`
  mergeDown () {
    if (this.storyboarderSketchPane.preventIfLocked()) return

    this.storyboarderSketchPane.mergeLayers(
      [
        this.storyboarderSketchPane.sketchPane.layers.findByName('reference').index,
        this.storyboarderSketchPane.sketchPane.layers.findByName('fill').index
      ],
      this.storyboarderSketchPane.sketchPane.layers.findByName('reference').index
    )
  }

  // merge `fill` and `reference` and draw to `fill`
  mergeUp () {
    if (this.storyboarderSketchPane.preventIfLocked()) return

    this.storyboarderSketchPane.mergeLayers(
      [
        this.storyboarderSketchPane.sketchPane.layers.findByName('reference').index,
        this.storyboarderSketchPane.sketchPane.layers.findByName('fill').index
      ],
      this.storyboarderSketchPane.sketchPane.layers.findByName('fill').index
    )
  }

  present (data) {
    if (data.opacity) {
      this.model.layers[data.opacity.index].opacity = data.opacity.value
      this.render(this.model)
      this.emit('opacity', data.opacity)
    }
  }

  // public method
  // value = 0...1.0
  setReferenceOpacity (value) {
    this.present({ opacity: { index: this.storyboarderSketchPane.sketchPane.layers.findByName('reference').index, value } })
  }

  getReferenceOpacity () {
    return this.model.layers[this.storyboarderSketchPane.sketchPane.layers.findByName('reference').index].opacity
  }

  render (model) {
    let index = this.storyboarderSketchPane.sketchPane.layers.findByName('reference').index
    let value = model.layers[index].opacity
    document.querySelector('.layers-ui-reference-opacity').value = value * 100
  }
}

module.exports = LayersEditor
