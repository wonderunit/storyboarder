/*

load rigged body
ability to focus on bones

*/



const EventEmitter = require('events').EventEmitter

const gl = require('gl')

const shotProperties = require('../shot-template-system/shot-properties.js')





// var width   = 64
// var height  = 64
// var (width, height, { preserveDrawingBuffer: true })

// //Clear screen to red
// gl.clearColor(1, 0, 0, 1)
// gl.clear(gl.COLOR_BUFFER_BIT)


class ShotTemplateSystem extends EventEmitter {
  constructor (element, options) {
    super()
    console.log("INIT SHOT TEMPLATE SYSTEM")
 
    this.glContext = gl(640,480, { preserveDrawingBuffer: true })


    console.log(this.glContext)
    this.ready = false
    this.definedShotParams = {}
    this.shotParams = {}

    // create scene
    // loader models and textures
    // after it's done, set ready

    // options = aspect ratio / width / height 
  }

  setSize(width, height) {

  }

  setDefinedShotParams (shotParams) {
    this.definedShotParams = {}
    if (shotParams) {
      for (let param in shotParams) {
        this.definedShotParams[param] = shotParams[param]
      }
    }
  }

  requestShot (shotParams) {
    if (shotParams) {
      this.setDefinedShotParams(shotParams)
    }
    this.createShotParams()
    // clearScene()
    // createScene()

    // render()

    return {image: 'image', shotParams: this.shotParams}
  }

  createShotParams() {
    this.shotParams = {}
    // find unset params
    for (let property in shotProperties) {
      if (this.definedShotParams[property]) {
        this.shotParams[property] = this.definedShotParams[property]
      } else {
        this.shotParams[property] = this.chooseRandomValue(shotProperties[property])
      }
    }
    // for the rest, randomize each

  }

  rand (min, max) {
    return Math.random() * (max - min) + min
  }

  chooseRandomValue (values) {
    let totalWeight = 0

    for (let value in values) {
      //console.log(value)
      totalWeight += values[value].weight
    }

    let randomNum = this.rand(0, totalWeight)
    let weightSum = 0

    //return totalWeight
    for (let value in values) {
      //console.log(value)
      weightSum += values[value].weight
      weightSum = +weightSum.toFixed(2)

      if (randomNum <= weightSum) {
        return value
      }
    }
  }

}

module.exports = ShotTemplateSystem