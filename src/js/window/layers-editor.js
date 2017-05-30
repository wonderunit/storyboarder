class LayersEditor {
  constructor (storyboarderSketchPane, sfx, notifications) {
    this.storyboarderSketchPane = storyboarderSketchPane
    this.sfx = sfx
    this.notifications = notifications

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
      this.setLayerOpacity(event.target.value / 100, 0)
    })
  }

  toggleLayer (index) {
    event.preventDefault()
    let curr = this.storyboarderSketchPane.sketchPane.getLayerOpacity(index)
    if (curr > 0) {
      this.storyboarderSketchPane.sketchPane.setLayerOpacity(0, index)
    } else {
      this.storyboarderSketchPane.sketchPane.setLayerOpacity(1, index)
    }
  }

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

  setLayerOpacity (opacity, index) {
    this.storyboarderSketchPane.sketchPane.setLayerOpacity(opacity, index)
  }
}

module.exports = LayersEditor