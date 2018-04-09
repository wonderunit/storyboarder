const EventEmitter = require('events').EventEmitter

const Brush = require('./brush')
const Stabilizer = require('./stabilizer')

const prefsModule = require('electron').remote.require('./prefs')

class SketchPane extends EventEmitter {
  constructor (imageDataList, properties) {
    super()
    if (properties != null) {
      for (var property in properties) {
        this[property] = properties[property]
      }
    }
    this.domElement = document.createElement('div')
    this.domElement.style.clear = 'both'
    this.domElement.style.setProperty('user-select', 'none')
    this.size = {width: 640, height: 480}
    this.layers = []
    this.layerIndex = 0
    this.paintingCanvas = document.createElement('canvas')
    this.paintingContext = this.paintingCanvas.getContext('2d')
    // todo change name
    this.paintingCanvas.className = 'sketchpane-painting-canvas'
    this.paintingCanvas.style.position = 'absolute'
    // this.paintingCanvas.style['mix-blend-mode'] = 'multiply'
    this.dirtyRectDisplay = document.createElement('canvas')
    this.dirtyRectDisplayContext = this.dirtyRectDisplay.getContext('2d')
    this.dirtyRectDisplay.className = 'sketchpane-dirty-rect-display'
    this.dirtyRectDisplay.style.position = 'absolute'
    this.renderDirtyRect = false
    // tool related properties
    this.tool = null
    this.toolStabilizeLevel = 0
    this.toolStabilizeWeight = 0.8
    this.stabilizer = null
    this.stabilizerInterval = 5
    this.tick
    this.tickInterval = 20
    this.paintingOpacity = 1
    this.paintingKnockout = false
    // knockoutsize  eraser size


    this.setTool(new Brush())

    this.isDrawing = false
    this.isStabilizing = false
    this.beforeKnockout = document.createElement('canvas')
    this.knockoutTick
    this.knockoutTickInterval = 20


    if (imageDataList != null) {
      if (imageDataList.length == 0) {
        return
      }
      let first = imageDataList[0]
      this.setCanvasSize(first.width, first.height)
      for (var i = 0; i < imageDataList.length; ++i) {
        let current = imageDataList[i]
        if ((current.width != first.width) || (current.height != first.height)) {
          throw 'all image data must have same size'
        }
        this.addLayer()
        let context = this.getLayerCanvas(i).getContext('2d')
        context.putImageData(current, 0, 0)
      }
      this.selectLayer(0)
    }

  }

  getDOMElement () {
    return this.domElement
  }

  // NOTE never used. could remove.
  //
  // getRelativePosition (absoluteX, absoluteY) {
  //   let rect = this.domElement.getBoundingClientRect()
  //   return { x: absoluteX - rect.left, y: absoluteY - rect.top }
  // }

  getCanvasSize () {
    return {width: this.size.width, height: this.size.height} //clone size
  }

  setCanvasSize (width, height, offsetX, offsetY) {
    offsetX = (offsetX == null) ? 0 : offsetX
    offsetY = (offsetY == null) ? 0 : offsetY
    this.size.width = width = Math.floor(width)
    this.size.height = height = Math.floor(height)
    this.paintingCanvas.width = width
    this.paintingCanvas.height = height
    this.dirtyRectDisplay.width = width
    this.dirtyRectDisplay.height = height
    this.domElement.style.width = width + 'px'
    this.domElement.style.height = height + 'px'
    for (var i=0; i<this.layers.length; ++i) {
      let canvas = this.getLayerCanvas(i)
      let context = this.getLayerContext(i)
      let imageData = context.getImageData(0, 0, width, height)
      canvas.width = width
      canvas.height = height
      context.putImageData(imageData, offsetX, offsetY)
    }
  }

  getCanvasWidth () {
    return this.size.width
  }
  
  setCanvasWidth (width, offsetX) {
    this.setCanvasSize(width, this.size.height, offsetX, 0)
  }
  
  getCanvasHeight () {
    return this.size.height
  }
  
  setCanvasHeight (height, offsetY) {
    this.setCanvasSize(this.size.width, height, 0, offsetY)
  }

  getLayerCanvas (index) {
    return this.layers[index].getElementsByClassName('sketchpane-layer-canvas')[0]
  }

  getLayerContext (index) {
    return this.getLayerCanvas(index).getContext('2d')
  }

  sortLayers () {
    while (this.domElement.firstChild) {
      this.domElement.removeChild(this.domElement.firstChild)
    }
    for (var i = 0; i < this.layers.length; ++i) {
      let layer = this.layers[i]
      this.domElement.appendChild(layer)
    }
    this.domElement.appendChild(this.dirtyRectDisplay)
  }

  drawDirtyRect (x, y, w, h) {
    let context = this.dirtyRectDisplayContext
    context.fillStyle = '#f00'
    // context.globalCompositeOperation = 'source-over'
    context.globalCompositeOperation = 'multiply'
    context.fillRect(x, y, w, h)
    if ((w > 2) && (h > 2)) {
      context.globalCompositeOperation = 'destination-out'
      context.fillRect(x + 1, y + 1, w - 2, h - 2)
    }
  }

  getRenderDirtyRect () {
    return this.renderDirtyRect
  }

  setRenderDirtyRect (render) {
    this.renderDirtyRect = render
    if (render == false) {
      this.dirtyRectDisplayContext.clearRect(0, 0, this.size.width, this.size.height)
    }
  }

  createLayerThumbnail (index, width, height) {
    index = (index == null) ? this.layerIndex : index
    width = (width == null) ? this.size.width : width
    height = (height == null) ? this.size.height : height
    let canvas = this.getLayerCanvas(index)
    let thumbnail = document.createElement('canvas')
    let thumbnailContext = thumbnail.getContext('2d')
    thumbnail.width = width
    thumbnail.height = height
    thumbnailContext.drawImage(canvas, 0, 0, width, height)
    return thumbnail
  }

  createFlattenThumbnail (width, height) {
    width = (width == null) ? this.size.width : width
    height = (height == null) ? this.size.height : height
    let thumbnail = document.createElement('canvas')
    let thumbnailContext = thumbnail.getContext('2d')
    thumbnail.width = width
    thumbnail.height = height
    for (var i = 0; i < this.layers.length; ++i) {
      if (!this.getLayerVisible(i)) {
        continue
      }
      let canvas = this.getLayerCanvas(i)
      thumbnailContext.globalAlpha = this.getLayerOpacity(i)
      thumbnailContext.drawImage(canvas, 0, 0, width, height)
    }
    return thumbnail
  }

  getLayers () {
    return this.layers.concat() //clone layers
  }

  getLayerCount () {
    return this.layers.length
  }

  addLayer (index) {
    index = (index == null) ? this.layers.length : index
    let layer = document.createElement('div')
    layer.className = 'sketchpane-layer'
    layer.style.visibility = 'visible'
    layer.style.opacity = 1
    let canvas = document.createElement('canvas')
    canvas.className = 'sketchpane-layer-canvas'
    canvas.width = this.size.width
    canvas.height = this.size.height
    canvas.style.position = 'absolute'
    layer.appendChild(canvas)
    this.domElement.appendChild(layer)
    this.layers.splice(index, 0, layer)
    this.sortLayers()
    this.selectLayer(this.layerIndex)
    this.emit('onlayeradd', {index: index})
    return layer
  }

  removeLayer (index) {
    index = (index == null) ? this.layerIndex : index
    this.domElement.removeChild(this.layers[index])
    this.layers.splice(index, 1)
    if (this.layerIndex == this.layers.length) {
      this.selectLayer(this.layerIndex - 1)
    }
    this.sortLayers()
    this.emit('onlayerremove', {index: index})
  }

  removeAllLayer () {
    while (this.layers.length) {
      this.removeLayer(0)
    }
  }

  swapLayer (layerA, layerB) {
    let layer = this.layers[layerA]
    this.layers[layerA] = this.layers[layerB]
    this.layers[layerB] = layer
    this.sortLayers()
    this.emit('onlayerswap', {a: layerA, b: layerB})
  }

  getCurrentLayerIndex () {
    return this.layerIndex
  }

  selectLayer (index) {
    let lastestLayerIndex = this.layers.length - 1
    if (index > lastestLayerIndex) {
      index = lastestLayerIndex
    }
    this.layerIndex = index
    if (this.paintingCanvas.parentElement != null) {
      this.paintingCanvas.parentElement.removeChild(this.paintingCanvas)
    }
    this.layers[index].appendChild(this.paintingCanvas)
    this.emit('onlayerselect', {index: index})
  }

  isEmptyLayer (index) {
    index = (index == null) ? this.layerIndex : index
    let context = this.getLayerContext(index)
    var blank = document.createElement('canvas')
    blank.width = context.canvas.width
    blank.height = context.canvas.height
    return context.canvas.toDataURL() == blank.toDataURL()
  }

  clearLayer (index) {
    index = (index == null) ? this.layerIndex : index
    let context = this.getLayerContext(index)
    context.clearRect(0, 0, this.size.width, this.size.height)
  }

  fillLayer (fillColor, index) {
    index = (index == null) ? this.layerIndex : index
    let context = this.getLayerContext(index)
    context.fillStyle = fillColor
    context.fillRect(0, 0, this.size.width, this.size.height)
  }

  fillLayerRect (fillColor, x, y, width, height, index) {
    index = (index == null) ? this.layerIndex : index
    let context = this.getLayerContext(index)
    context.fillStyle = fillColor
    context.fillRect(x, y, width, height)
  }

  floodFill (x, y, r, g, b, a, index) {
    index = (index == null) ? this.layerIndex : index
    let context = this.getLayerContext(index)
    let w = size.width
    let h = size.height
    if ((x < 0) || (x >= w) || (y < 0) || (y >= h)) {
      return
    }
    let imageData = context.getImageData(0, 0, w, h)
    let d = imageData.data
    let targetColor = getColor(x, y)
    let replacementColor = (r << 24) | (g << 16) | (b << 8) | a
    if (targetColor === replacementColor) {
      return
    }

    function getColor(x, y) {
      let index = ((y * w) + x) * 4
      return ((d[index] << 24) | (d[index + 1] << 16) | (d[index + 2] << 8) | d[index + 3])
    }

    function setColor(x, y) {
      let index = ((y * w) + x) * 4
      d[index] = r
      d[index + 1] = g
      d[index + 2] = b
      d[index + 3] = a
    }

    let queue = [];
    queue.push(x, y)

    while (queue.length) {
      let nx = queue.shift()
      let ny = queue.shift()
      if ((nx < 0) || (nx >= w) || (ny < 0) || (ny >= h) || (getColor(nx, ny) !== targetColor)) {
        continue
      }
      let west, east
      west = east = nx
      do {
        let wc = getColor(--west, ny)
      } while ((west >= 0) && (wc === targetColor))
      do {
        let ec = getColor(++east, ny)
      } while ((east < w) && (ec === targetColor))
      for (var i = west + 1; i < east; ++i) {
        setColor(i, ny)
        var north = ny - 1
        var south = ny + 1
        if (getColor(i, north) === targetColor) {
          queue.push(i, north)
        }
        if (getColor(i, south) === targetColor) {
          queue.push(i, south)
        }
      }
    }
    context.putImageData(imageData, 0, 0)
  }

  flipLayer (index, vertical) {
    console.log(vertical)
    let canvas = this.getLayerCanvas(index)
    let context = this.getLayerContext(index)

    context.save()
    context.globalAlpha = 1
    context.globalCompositeOperation = 'copy'

    if (vertical) {
      context.translate(0, context.canvas.height)
      context.scale(1, -1)
    } else {
      context.translate(context.canvas.width, 0)
      context.scale(-1, 1)
    }

    context.drawImage(context.canvas, 0, 0)
    context.setTransform(1, 0, 0, 1, 0, 0)

    context.restore()
  }

  getLayerOpacity (index) {
    index = (index == null) ? this.layerIndex : index
    let opacity = parseFloat(this.layers[index].style.getPropertyValue('opacity'))
    return window.isNaN(opacity) ? 1 : opacity
  }

  setLayerOpacity (opacity, index) {
    index = (index == null) ? this.layerIndex : index
    this.layers[index].style.opacity = opacity
  }

  getLayerVisible (index) {
    index = (index == null) ? this.layerIndex : index
    let visible = this.layers[index].style.getPropertyValue('visibility')
    return visible != 'hidden'
  }

  setLayerVisible (visible, index) {
    index = (index == null) ? this.layerIndex : index
    this.layers[index].style.visibility = visible ? 'visible' : 'hidden'
  }

  getTool () {
    return this.tool
  }

  setTool (value) {
    this.tool = value
    this.paintingContext = this.paintingCanvas.getContext('2d')
    if (this.tool && this.tool.setContext) {
      this.tool.setContext(this.paintingContext)
    }
  }

  getPaintingOpacity () {
    return this.paintingOpacity
  }

  setPaintingOpacity (opacity) {
    this.paintingOpacity = opacity
  }

  getPaintingKnockout () {
    return this.paintingKnockout
  }

  setPaintingKnockout (knockout) {
    this.paintingKnockout = knockout
    this.paintingCanvas.style.visibility = knockout ? 'hidden' : 'visible'
  }

  getTickInterval () {
    return this.tickInterval
  }

  setTickInterval (interval) {
    this.tickInterval = interval
  }

  /*
  stabilize level is the number of coordinate tracker.
  higher stabilize level makes lines smoother.
  */
  getToolStabilizeLevel () {
    return this.toolStabilizeLevel
  }
  
  setToolStabilizeLevel (level) {
    this.toolStabilizeLevel = (level < 0) ? 0 : level
  }
  
  /*
  higher stabilize weight makes trackers follow slower.
  */
  getToolStabilizeWeight () {
    return this.toolStabilizeWeight
  }

  setToolStabilizeWeight (weight) {
    this.toolStabilizeWeight = weight
  }

  getToolStabilizeInterval () {
    return this.stabilizerInterval
  }

  setToolStabilizeInterval (interval) {
    this.stabilizerInterval = interval
  }

  gotoBeforeKnockout () {
    let context = this.getLayerContext(this.layerIndex)
    let w = this.size.width
    let h = this.size.height
    context.clearRect(0, 0, w, h)
    context.drawImage(this.beforeKnockout, 0, 0, w, h)
  }

  drawPaintingCanvas () { //draw painting canvas on current layer
    let context = this.getLayerContext(this.layerIndex)
    let w = this.size.width
    let h = this.size.height
    context.save()
    if (this.paintingKnockout) {
      context.globalAlpha = 1
    } else {
      context.globalAlpha = this.paintingOpacity
    }
    
    //context.globalCompositeOperation = this.paintingKnockout ? 'destination-out' : 'source-over'
    context.globalCompositeOperation = this.paintingKnockout ? 'destination-out' : 'multiply'
    context.drawImage(this.paintingCanvas, 0, 0, w, h)
    context.restore()
  }
  
  _move (x, y, pressure) {
    if (this.tool.move) {
      this.tool.move(x, y, pressure);
    }
    this.emit('onmove', {x: x, y: y, pressure: pressure})
  }

  _up (x, y, pressure) {
    this.emit('onbeforeup')
    this.isDrawing = false
    this.isStabilizing = false
    let dirtyRect
    if (this.tool.up) {
      dirtyRect = this.tool.up(x, y, pressure)
    }
    if (this.paintingKnockout) {
      this.gotoBeforeKnockout()
    }
    if (this.dirtyRect) {
      // undo
    } else {

    }
    this.drawPaintingCanvas()
    this.paintingContext.clearRect(0, 0, this.size.width, this.size.height)
    dirtyRect = dirtyRect || {x: 0, y: 0, width: this.size.width, height: this.size.height}
    this.emit('onup', {x: x, y: y, pressure: pressure, dirtyRect: dirtyRect})
    clearInterval(this.knockoutTick)
    clearInterval(this.tick)
  }

  down (x, y, pressure) {
    if (this.isDrawing || this.isStabilizing) {
      throw 'still drawing'
    }
    this.isDrawing = true
    if (this.tool == null) {
      return
    }
    if (this.paintingKnockout) {
      let w = this.size.width
      let h = this.size.height
      let canvas = this.getLayerCanvas(this.layerIndex)
      let beforeKnockoutContext = this.beforeKnockout.getContext('2d')
      this.beforeKnockout.width = w
      this.beforeKnockout.height = h
      beforeKnockoutContext.clearRect(0, 0, w, h)
      beforeKnockoutContext.drawImage(canvas, 0, 0, w, h)
    }
    let down = this.tool.down.bind(this.tool)
    if (this.toolStabilizeLevel > 0) {
      this.stabilizer = new Stabilizer(down, this._move.bind(this), this._up.bind(this), this.toolStabilizeLevel, this.toolStabilizeWeight, x, y, pressure, this.stabilizerInterval)
      this.isStabilizing = true
    } else if (down != null) {
      down(x, y, pressure)
    }
    this.emit('ondown', {x: x, y: y, pressure: pressure})
    this.knockoutTick = setInterval( function () {
        if (this.paintingKnockout) {
          this.gotoBeforeKnockout()
          this.drawPaintingCanvas()
        }
      }.bind(this), this.knockoutTickInterval)
    this.tick = setInterval(function () {
        if (this.tool.tick) {
          this.tool.tick()
        }
        this.emit('ontick')
      }.bind(this), this.tickInterval)
  }

  move (x, y, pressure) {
    if (!this.isDrawing) {
      throw 'you need to call \'down\' first'
    }
    if (this.tool == null) {
      return
    }
    if (this.stabilizer != null) {
      this.stabilizer.move(x, y, pressure)
    } else if (!this.isStabilizing) {
      this._move(x, y, pressure)
    }
  }

  up (x, y, pressure) {
    if (!this.isDrawing) {
      throw 'you need to call \'down\' first'
    }
    if (this.tool == null) {
      this.isDrawing = false
      return
    }
    if (this.stabilizer != null) {
      this.stabilizer.up(x, y, pressure)
    } else {
      this._up(x, y, pressure)
    }
    this.stabilizer = null
  }

  createChecker (cellSize, colorA, colorB) {
    cellSize = (cellSize == null) ? 10 : cellSize
    colorA = (colorA == null) ? '#fff' : colorA
    colorB = (colorB == null) ? '#ccc' : colorB
    let size = cellSize + cellSize
    let checker = document.createElement('canvas')
    checker.width = checker.height = size
    let context = checker.getContext('2d')
    context.fillStyle = colorB
    context.fillRect(0, 0, size, size)
    context.fillStyle = colorA
    context.fillRect(0, 0, cellSize, cellSize)
    context.fillRect(cellSize, cellSize, size, size)
    return checker
  }

  createBrushPointer (brushImage, brushSize, brushAngle, threshold, antialias, color) {
    brushSize = brushSize | 0
    let pointer = document.createElement('canvas')
    let pointerContext = pointer.getContext('2d')
    if (brushSize == 0) {
      pointer.width = 1
      pointer.height = 1
      return pointer
    }
    if (brushImage == null) {
      let halfSize = (brushSize * 0.5) | 0
      pointer.width = brushSize
      pointer.height = brushSize
      pointerContext.fillStyle = '#000'
      pointerContext.beginPath()
      pointerContext.arc(halfSize, halfSize, halfSize, 0, Math.PI * 2)
      pointerContext.closePath()
      pointerContext.fill()
    }
    else {
      let width = brushSize;
      let height = brushSize * (brushImage.height / brushImage.width);
      let toRad = Math.PI / 180;
      let ra = brushAngle * toRad;
      let abs = Math.abs;
      let sin = Math.sin;
      let cos = Math.cos;
      let boundWidth = abs(height * sin(ra)) + abs(width * cos(ra));
      let boundHeight = abs(width * sin(ra)) + abs(height * cos(ra));
      pointer.width = boundWidth;
      pointer.height = boundHeight;
      pointerContext.save();
      pointerContext.translate(boundWidth * 0.5, boundHeight * 0.5);
      pointerContext.rotate(ra);
      pointerContext.translate(width * -0.5, height * -0.5);
      pointerContext.drawImage(brushImage, 0, 0, width, height);
      pointerContext.restore();
    }
    //return pointer
    return this.createAlphaThresholdBorder(pointer, threshold, antialias, color)
  }

  createAlphaThresholdBorder (image, threshold, antialias, color) {
    threshold = (threshold == null) ? 0x80 : threshold
    color = (color == null) ? '#000' : color
    let width = image.width
    let height = image.height
    let canvas = document.createElement('canvas')
    let context = canvas.getContext('2d')
    canvas.width = width
    canvas.height = height
    try {
      context.drawImage(image, 0, 0, width, height)
    } catch (e) {
      return canvas
    }
    let imageData = context.getImageData(0, 0, width, height)
    let d = imageData.data
    function getAlphaIndex(index) {
      return d[index * 4 + 3]
    }
    function setRedIndex(index, red) {
      d[index * 4] = red
    }
    function getRedXY(x, y) {
      let red = d[((y * width) + x) * 4]
      return red ? red : 0
    }
    function getGreenXY(x, y) {
      let green = d[((y * width) + x) * 4 + 1]
      return green
    }
    function setColorXY(x, y, red, green, alpha) {
      let i = ((y * width) + x) * 4
      d[i] = red
      d[i + 1] = green
      d[i + 2] = 0
      d[i + 3] = alpha
    }
    //threshold
    var pixelCount = (d.length * 0.25) | 0;
    for (var i = 0; i < pixelCount; ++i)
        setRedIndex(i, (getAlphaIndex(i) < threshold) ? 0 : 1);
    //outline
    var x;
    var y;
    for (x = 0; x < width; ++x) {
        for (y = 0; y < height; ++y) {
            if (!getRedXY(x, y)) {
                setColorXY(x, y, 0, 0, 0);
            }
            else {
                var redCount = 0;
                var left = x - 1;
                var right = x + 1;
                var up = y - 1;
                var down = y + 1;
                redCount += getRedXY(left, up);
                redCount += getRedXY(left, y);
                redCount += getRedXY(left, down);
                redCount += getRedXY(right, up);
                redCount += getRedXY(right, y);
                redCount += getRedXY(right, down);
                redCount += getRedXY(x, up);
                redCount += getRedXY(x, down);
                if (redCount != 8)
                    setColorXY(x, y, 1, 1, 255);
                else
                    setColorXY(x, y, 1, 0, 0);
            }
        }
    }
    //antialias
    if (antialias) {
        for (x = 0; x < width; ++x) {
            for (y = 0; y < height; ++y) {
                if (getGreenXY(x, y)) {
                    var alpha = 0;
                    if (getGreenXY(x - 1, y) != getGreenXY(x + 1, y))
                        setColorXY(x, y, 1, 1, alpha += 0x40);
                    if (getGreenXY(x, y - 1) != getGreenXY(x, y + 1))
                        setColorXY(x, y, 1, 1, alpha + 0x50);
                }
            }
        }
    }
    context.putImageData(imageData, 0, 0);
    context.globalCompositeOperation = 'source-in';
    context.fillStyle = color;
    context.fillRect(0, 0, width, height);
    return canvas;
  }
}

module.exports = SketchPane