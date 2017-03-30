const EventEmitter = require('events').EventEmitter

const min = Math.min
const max = Math.max
const abs = Math.abs
const sin = Math.sin
const cos = Math.cos
const sqrt = Math.sqrt
const atan2 = Math.atan2
const PI = Math.PI
const ONE = PI + PI
const QUARTER = PI * 0.5
const toRad = PI / 180
const toDeg = 1 / toRad

class Brush extends EventEmitter {
  constructor (properties) {
    super()
    this.random = Math.random
    this.context = null
    this.color = '#000'
    this.transformedImageIsDirty = true
    this.flow = 1
    this.size = 10
    this.spacing = 0.2
    this.angle = 0
    this.rotateToDirection = false
    this.normalSpread = 0
    this.tangentSpread = 0
    this.image = null
    this.transformedImage = null
    this.transformedImageIsDirty = true
    this.imageRatio = 1
    this.delta = 0
    this.prevX = 0
    this.prevY = 0
    this.lastX = 0
    this.lastY = 0
    this.dir = 0
    this.prevScale = 0
    this.drawFunction = this.drawCircle
    this.reserved = null
    this.dirtyRect = null

    this.hardness = 0.99
    // tilt stuff?

    // pass in properties for setting all at once?
    if (properties != null) {
      for (var property in properties) {
        this[property] = properties[property]
      }
    }
  }

  setRandomFunction (value) {
    this.random = value
  }

  getContext () {
    return this.context
  }

  setContext (value) {
    this.context = value
  }

  getColor () {
    return this.color
  }

  setColor (value) {
    this.color = value
    this.transformedImageIsDirty = true
  }

  getFlow () {
    return this.flow
  }
  
  setFlow (value) {
    this.flow = value
    this.transformedImageIsDirty = true
  }

  getHardness () {
    return this.hardness
  }

  setHardness (value) {
    this.hardness = Math.max(Math.min(value, 0.999), 0)
  }

  getSize () {
    return this.size
  }
  
  setSize (value) {
    this.size = (value < 1) ? 1 : value
    this.transformedImageIsDirty = true
  }

  getSpacing () {
    return this.spacing
  }
  
  setSpacing (value) {
    this.spacing = (value < 0.01) ? 0.01 : value;
  }

  getAngle () { 
    // returns degree unit
    return this.angle * toDeg
  }
    
  setAngle (value) {
    this.angle = value * toRad
  }

  getRotateToDirection () {
    return this.rotateToDirection
  }
    
  setRotateToDirection (value) {
    this.rotateToDirection = value
  }

  getNormalSpread () {
    return this.normalSpread
  }
  
  setNormalSpread (value) {
    this.normalSpread = value
  }

  getTangentSpread () {
    return this.tangentSpread
  }

  setTangentSpread (value) {
    this.tangentSpread = value
  }

  getImage () {
    return this.image
  }

  setImage (value) {
    if (value == null) {
      this.transformedImage = this.image = null
      this.imageRatio = 1
      this.drawFunction = this.drawCircle
    } else if (value !== image) {
      this.image = value
      this.imageRatio = this.image.height / this.image.width
      this.transformedImage = document.createElement('canvas')
      this.drawFunction = this.drawImage
      this.transformedImageIsDirty = true
    }
  }

  spreadRandom () {
    return this.random() - 0.5
  }
  
  drawReserved () {
    if (this.reserved !== null) {
      drawTo(this.reserved.x, this.reserved.y, this.reserved.scale)
      this.reserved = null
    }
  }

  appendDirtyRect (x, y, width, height) {
    if (!(width && height)) {
      return
    }
    let dxw = this.dirtyRect.x + this.dirtyRect.width
    let dyh = this.dirtyRect.y + this.dirtyRect.height
    let xw = x + width
    let yh = y + height
    let minX = this.dirtyRect.width ? min(this.dirtyRect.x, x) : x
    let minY = this.dirtyRect.height ? min(this.dirtyRect.y, y) : y
    this.dirtyRect.x = minX
    this.dirtyRect.y = minY
    this.dirtyRect.width = max(dxw, xw) - minX
    this.dirtyRect.height = max(dyh, yh) - minY
  }

  transformImage () {
    this.transformedImage.width = this.size
    this.transformedImage.height = this.size * this.imageRatio
    let brushContext = this.transformedImage.getContext('2d')
    brushContext.clearRect(0, 0, this.transformedImage.width, this.transformedImage.height)
    brushContext.drawImage(this.image, 0, 0, this.transformedImage.width, this.transformedImage.height)
    brushContext.globalCompositeOperation = 'multiply'
    brushContext.fillStyle = this.color
    brushContext.globalAlpha = this.flow
    brushContext.fillRect(0, 0, this.transformedImage.width, this.transformedImage.height)
  }

  drawCircle (size, eraser) {
    let halfSize = size * 0.5
    this.context.fillStyle = this.color
    if (eraser) {
      this.context.globalAlpha = 1
    } else {
      this.context.globalAlpha = this.flow * Math.pow((size / this.size),1.8)
    }

    // this.context.beginPath()
    // this.context.arc(halfSize, halfSize, halfSize, 0, ONE)
    // this.context.closePath()
    // this.context.fill()
    let gradient = this.context.createRadialGradient(halfSize, halfSize, halfSize, halfSize, halfSize, halfSize*this.hardness);
    gradient.addColorStop(0, this.hexToRgbA(this.color));
    gradient.addColorStop(1, this.color);
    this.context.fillStyle = gradient;
    this.context.fillRect(0, 0, size, size);
  }

  hexToRgbA(hex){
    let c
    if(/^#([A-Fa-f0-9]{3}){1,2}$/.test(hex)){
        c= hex.substring(1).split('')
        if(c.length== 3){
          c= [c[0], c[0], c[1], c[1], c[2], c[2]]
        }
        c= '0x'+c.join('')
        return 'rgba('+[(c>>16)&255, (c>>8)&255, c&255].join(',')+',0)'
    }
    throw new Error('Bad Hex')
  }

  drawImage (size) {
    if (this.transformedImageIsDirty)
      transformImage()
    try {
      this.context.drawImage(this.transformedImage, 0, 0, size, size * this.imageRatio);
    } catch (e) {
      drawCircle(size)
    }
  }

  drawTo (x, y, scale) {
    let scaledSize = this.size * scale
    let nrm = this.dir + QUARTER
    let nr = this.normalSpread * scaledSize * this.spreadRandom()
    let tr = this.tangentSpread * scaledSize * this.spreadRandom()
    let ra = this.rotateToDirection ? this.angle + this.dir : this.angle
    let width = scaledSize
    let height = width * this.imageRatio
    let boundWidth = abs(height * sin(ra)) + abs(width * cos(ra))
    let boundHeight = abs(width * sin(ra)) + abs(height * cos(ra))
    x += Math.cos(nrm) * nr + Math.cos(this.dir) * tr
    y += Math.sin(nrm) * nr + Math.sin(this.dir) * tr
    this.context.save()
    this.context.translate(x, y)
    this.context.rotate(ra)
    this.context.translate(-(width * 0.5), -(height * 0.5))
    let eraser = false
    if (scale > 1) {
      eraser = true
    }
    this.drawFunction(width, eraser)
    this.context.restore()
    this.appendDirtyRect(x - (boundWidth * 0.5), y - (boundHeight * 0.5),boundWidth, boundHeight)
  }

  down (x, y, scale) {
    if (this.context == null) {
      throw 'brush needs the context'
    }
    this.dir = 0
    this.dirtyRect = {x: 0, y: 0, width: 0, height: 0}
    if (scale > 0) {
      if (this.rotateToDirection || this.normalSpread !== 0 || this.tangentSpread !== 0) {
        this.reserved = {x: x, y: y, scale: scale}
      } else {
        this.drawTo(x, y, scale)
      }
    }
    this.delta = 0
    this.lastX = this.prevX = x
    this.lastY = this.prevY = y
    this.prevScale = scale
  }

  move (x, y, scale) {
    if (this.context == null) {
      throw 'brush needs the context'
    }
    if (scale <= 0) {
      this.delta = 0
      this.prevX = x
      this.prevY = y
      this.prevScale = scale
      return
    }
    let dx = x - this.prevX
    let dy = y - this.prevY
    let ds = scale - this.prevScale
    let d = sqrt(dx * dx + dy * dy)
    this.prevX = x
    this.prevY = y
    this.delta += d
    let midScale = (this.prevScale + scale) * 0.5
    let drawSpacing = this.size * this.spacing * midScale
    let ldx = x - this.lastX
    let ldy = y - this.lastY
    let ld = sqrt(ldx * ldx + ldy * ldy)
    this.dir = atan2(ldy, ldx)
    if (ldx || ldy) {
      this.drawReserved()
    }
    if (drawSpacing < 0.5) {
      drawSpacing = 0.5
    }
    if (this.delta < drawSpacing) {
      this.prevScale = scale
      return
    }
    let scaleSpacing = ds * (drawSpacing / this.delta)
    if (ld < drawSpacing) {
      this.lastX = x
      this.lastY = y
      this.drawTo(this.lastX, this.lastY, scale)
      this.delta -= drawSpacing
    } else {
      while(this.delta >= drawSpacing) {
        ldx = x - this.lastX
        ldy = y - this.lastY
        var tx = cos(this.dir)
        var ty = sin(this.dir)
        this.lastX += tx * drawSpacing
        this.lastY += ty * drawSpacing
        this.prevScale += scaleSpacing
        this.drawTo(this.lastX, this.lastY, this.prevScale)
        this.delta -= drawSpacing
      }
    }
    this.prevScale = scale
  }

  up (x, y, scale) {
    this.dir = atan2(y - this.lastY, x - this.lastX)
    this.drawReserved()
    return this.dirtyRect
  }

}

module.exports = Brush