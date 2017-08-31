const EventEmitter = require('events').EventEmitter

const {
  LAYER_INDEX_REFERENCE
} = require('../constants')

const { DEFAULT_REFERENCE_LAYER_OPACITY } = require('../exporters/common')

class LayersEditor extends EventEmitter {
  constructor (storyboarderSketchPane, sfx, notifications) {
    super()
    this.storyboarderSketchPane = storyboarderSketchPane
    this.sfx = sfx
    this.notifications = notifications

    this.model = {
      layers: {
        [LAYER_INDEX_REFERENCE]: {
          opacity: DEFAULT_REFERENCE_LAYER_OPACITY / 100
        }
      }
    }

    // document.querySelector('.layers-ui-notes-visible').addEventListener('pointerdown', this.toggleLayer.bind(this, 3))
    document.querySelector('.layers-ui-notes-clear').addEventListener('click', ()=>{
      this.clearLayer(3)
        sfx.down(-1,2)
        sfx.playEffect('trash')
        notifications.notify({message: 'Cleared notes layer.', timing: 5})
    })
    document.querySelector('.layers-ui-reference-clear').addEventListener('click', ()=>{
      this.clearLayer(0)
        sfx.down(-1,0)
        sfx.playEffect('trash')
        notifications.notify({message: 'Cleared light layer.', timing: 5})
    })
    // document.querySelector('.layers-ui-main-visible').addEventListener('pointerdown', this.toggleLayer.bind(this, 1))
    document.querySelector('.layers-ui-main-merge').addEventListener('click', ()=>{
      this.mergeDown()
        sfx.negative()
        notifications.notify({message: 'Merged the main layer down to the reference layer. If this is not what you want, undo now!', timing: 5})
    })
    // document.querySelector('.layers-ui-reference-visible').addEventListener('pointerdown', this.toggleLayer.bind(this, 0))
    document.querySelector('.layers-ui-reference-merge').addEventListener('click', ()=>{
      this.mergeUp()
        sfx.negative()
        notifications.notify({message: 'Merged the light layer up to the main layer. The light layer is now baked into the main layer. If this is not what you want, undo now!', timing: 5})
    })

    document.querySelector('.layers-ui-reference-opacity').addEventListener('input', event => {
      event.preventDefault()
      this.setReferenceOpacity(event.target.value / 100)
    })

    this.render(this.model)
  }

  // NOT USED
  //
  // toggleLayer (index) {
  //   event.preventDefault()
  //   this.present({ opacity: { index: LAYER_INDEX_REFERENCE, toggle: true })
  // }

  clearLayer (index) {
    event.preventDefault()
    this.storyboarderSketchPane.clearLayers([index])
  }

  // merge `main` and `reference` and draw to `reference`
  mergeDown () {
    event.preventDefault()
    this.storyboarderSketchPane.mergeLayers([0, 1], 0) // HACK hardcoded
  }

  // merge `main` and `reference` and draw to `main`
  mergeUp () {
    this.storyboarderSketchPane.mergeLayers([0, 1], 1) // HACK hardcoded
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
    this.present({ opacity: { index: LAYER_INDEX_REFERENCE, value }})
  }
  
  render (model) {
    let index = LAYER_INDEX_REFERENCE
    let value = model.layers[index].opacity
    document.querySelector('.layers-ui-reference-opacity').value = value * 100
    this.storyboarderSketchPane.sketchPane.setLayerOpacity(value, index)
  }
}

module.exports = LayersEditor
