class LayersEditor {
  constructor (storyboarderSketchPane) {
    this.storyboarderSketchPane = storyboarderSketchPane

    document.querySelector('.layers-ui-notes-visible').addEventListener('pointerdown', this.toggleLayer.bind(this, 3))
    document.querySelector('.layers-ui-notes-clear').addEventListener('pointerdown', this.clearLayer.bind(this, 3))

    document.querySelector('.layers-ui-main-visible').addEventListener('pointerdown', this.toggleLayer.bind(this, 1))
    document.querySelector('.layers-ui-main-merge').addEventListener('pointerdown', this.mergeDown.bind(this))

    document.querySelector('.layers-ui-reference-visible').addEventListener('pointerdown', this.toggleLayer.bind(this, 0))
    document.querySelector('.layers-ui-reference-merge').addEventListener('pointerdown', this.mergeUp.bind(this))
    document.querySelector('.layers-ui-reference-clear').addEventListener('pointerdown', this.clearLayer.bind(this, 0))

    document.querySelector('.layers-ui-reference-opacity').addEventListener('input', event => {
      event.preventDefault()
      this.setLayerOpacity(event.target.value / 100, 0)
    })

    setImmediate(() => document.querySelector('.layers-ui-reference-opacity').value = 100)
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

  // main to reference
  mergeDown () {
    event.preventDefault()
    console.log('mergeDown')
  }

  // reference to main
  mergeUp () {
    event.preventDefault()
    console.log('mergeUp')
  }

  setLayerOpacity (opacity, index) {
    this.storyboarderSketchPane.sketchPane.setLayerOpacity(opacity, index)
  }
}

module.exports = LayersEditor
