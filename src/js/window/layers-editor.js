const EventEmitter = require('events').EventEmitter

const { DEFAULT_REFERENCE_LAYER_OPACITY } = require('../exporters/common')

class LayersEditor extends EventEmitter {
  constructor (storyboarderSketchPane, sfx, notifications) {
    super()
    this.storyboarderSketchPane = storyboarderSketchPane
    this.sfx = sfx
    this.notifications = notifications

    // document.querySelector('.layers-ui-notes-visible').addEventListener('pointerdown', this.toggleLayer.bind(this, 3))
    document
      .querySelector('.layers-ui-notes-clear')
      .addEventListener('click', () => {
        event.preventDefault()
        this.clearLayer('notes')
        sfx.down(-1, 2)
        sfx.playEffect('trash')
        notifications.notify({ message: 'Cleared notes layer.', timing: 5 })
      })
    document
      .querySelector('.layers-ui-reference-clear')
      .addEventListener('click', event => {
        event.preventDefault()
        this.clearLayer('reference')
        sfx.down(-1, 0)
        sfx.playEffect('trash')
        notifications.notify({ message: 'Cleared reference layer.', timing: 5 })
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
            'Merged the reference layer up to the fill layer. The reference layer is now baked into the fill layer. If this is not what you want, undo now!',
          timing: 5
        })
      })

    document
      .querySelector('.layers-ui-reference-opacity')
      .addEventListener('input', event => {
        event.preventDefault()
        this.setReferenceOpacity(event.target.value / 100)
      })

    this.render()
  }

  // NOT USED
  //
  // toggleLayer (index) {
  //   event.preventDefault()
  //   this.present({ opacity: { index: this.storyboarderSketchPane.sketchPane.layers.findByName('reference').index, toggle: true })
  // }

  clearLayer (name) {
    if (this.storyboarderSketchPane.preventIfLocked()) return

    this.storyboarderSketchPane.clearLayers([
      this.storyboarderSketchPane.sketchPane.layers.findByName(name).index
    ])
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

  loadReferenceOpacity (board) {
    let value = DEFAULT_REFERENCE_LAYER_OPACITY

    // if there is layer data ...
    if (board.layers) {
      // ... prefer the reference layer opacity ...
      if (board.layers.reference && board.layers.reference.opacity != null) {
        value = board.layers.reference.opacity
      // ... otherwise, try for the shot-generator opacity ...
      } else if (board.layers['shot-generator'] && board.layers['shot-generator'].opacity != null) {
        value = board.layers['shot-generator'].opacity
      }
    }

    this.setReferenceOpacity(value)
  }

  getReferenceOpacity () {
    return this.storyboarderSketchPane.sketchPane.layers.findByName('reference').getOpacity()
  }

  setReferenceOpacity (value) {
    this.storyboarderSketchPane.sketchPane.layers.findByName('reference').setOpacity(value)
    this.storyboarderSketchPane.sketchPane.layers.findByName('shot-generator').setOpacity(value)
    this.render()
    this.emit('opacity')
  }

  render () {
    let value = this.storyboarderSketchPane.sketchPane.layers.findByName('reference').getOpacity()
    document.querySelector('.layers-ui-reference-opacity').value = value * 100
  }
}

module.exports = LayersEditor
