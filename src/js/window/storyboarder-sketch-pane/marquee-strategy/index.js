const paper = require('paper')
const SketchPaneUtil = require('alchemancy').util
const { clipboard } = require('electron')

const notifications = require('../../notifications')
const SelectionStrategy = require('./selection-strategy')
const OperationStrategy = require('./operation-strategy')
const { getFillColor, getFillAlpha } = require('./selectors')

class MarqueeStrategy {
  constructor (context) {
    this.context = context
    this.name = 'marquee'

    this.strategies = {
      selection: new SelectionStrategy(this.context, this),
      operation: new OperationStrategy(this.context, this)
    }

    this.marqueeTransitionEvent = null
    this.marqueePath = null
  }

  startup () {
    this.setStrategy('selection')
  }

  shutdown () {
    if (this.strategy) {
      this.strategy.shutdown()
      this.strategy = null
    }
  }

  setStrategy (strategy) {
    if (this.strategy) this.strategy.shutdown()
    this.strategy = this.strategies[strategy]
    this.strategy.startup()
  }

  fakePointerDown (event) {
    if (this.strategy) {
      this.strategy._onPointerDown(event)
    }
  }

  findLayerByName (name) {
    return this.context.sketchPane.layers.findByName(name)
  }

  copyToClipboard (marqueePath, image, spritesByLayerId) {
    // marquee data, including path and bounds
    let marquee = {
      path: JSON.parse(marqueePath.exportJSON()),
    }

    // data for each marquee layer
    let width = marqueePath.bounds.width
    let height = marqueePath.bounds.height

    let imageDataByLayerId = spritesByLayerId.reduce(
      (coll, sprite, index) => {
        let pixels = this.context.sketchPane.app.renderer.plugins.extract.pixels(sprite.texture)
        SketchPaneUtil.arrayPostDivide(pixels)
        let canvas = SketchPaneUtil.pixelsToCanvas(pixels, width, height)
        coll[this.context.sketchPane.layers[index].name] = canvas.toDataURL()
        return coll
      },
      {}
    )

    clipboard.clear()
    clipboard.write({
      image,
      text: JSON.stringify(
        {
          marquee,
          imageDataByLayerId
        },
        null,
        2
      )
    })
  }

  pasteFromClipboard (contents) {
    this.setStrategy('operation')
    this.strategy.fromClipboard(contents)
    notifications.notify({ message: 'Pasted selection', timing: 5 })
  }
}

module.exports = MarqueeStrategy
