/*
    TODO:
      figure out scaling based on location
      simplify line
       
// light-pencil
sketchpane.setBrush(4,[200,220,255],30,50,'reference')

//pencil
sketchpane.setBrush(2,[50,50,50],5,70,'main')

// brush
sketchpane.setBrush(20,[0,0,100],2,20,'main')

// ink
sketchpane.setBrush(3,[0,0,0],60,80,'main')

//notes 
sketchpane.setBrush(4,[255,0,0],100,100,'notes')


*/
const EventEmitter = require('events').EventEmitter
module.exports = new EventEmitter()

let util = require('./utils/index.js')
let undoStack = require('./undo-stack.js')

const getCurvePoints = require("cardinal-spline-js").getCurvePoints
const TO_RADIANS = Math.PI/180
const TO_DEGREES = 1 / TO_RADIANS

let prevTimestamp = 0

let parentDiv

let boardContext
let drawContext
let boardSize = []

let penDown
let pointArray = []
let lastProcessedPoint = 0

const brushCount = 256
let brushImages = []

const paneMargin = 100

let viewportScale = 1.0
let viewportCenter = [0.5,0.5]

let lastPlotPoint = []
let previousPenAttributes

let brushColor = [200,220,255]
let brushSize = 4
let brushOpacity = 30
let layerOpacity = 50

let lineDistance = 0

let cursorDiv

let eraserMode = false
let moveMode = false
let scaleMode = false
let isMoving = false
let isStraightline = false
let straightDirection = false
let straightAnchor = false

let setBrushColor = (color)=> {
  brushColor = color
  for (var i=0;i<brushCount;i++) {
    let brushCanvas = document.createElement('canvas')
    brushCanvas.width = brushCanvas.height = 30
    let brushContext = brushCanvas.getContext('2d')
    let grd = brushContext.createRadialGradient(
      brushCanvas.width / 2, brushCanvas.height / 2,
      brushCanvas.width / 4,
      brushCanvas.width / 2, brushCanvas.height / 2,
      brushCanvas.width / 2)
    let rVal = 255-Math.floor((i/brushCount)*(255-color[0]))
    let gVal = 255-Math.floor((i/brushCount)*(255-color[1]))
    let bVal = 255-Math.floor((i/brushCount)*(255-color[2]))
    //gVal = bVal =  0
    grd.addColorStop(0,"rgba(" + rVal + "," + gVal + "," + bVal + ",1)")
    grd.addColorStop(1,"rgba(" + rVal + "," + gVal + "," + bVal + ",0)")
    brushContext.fillStyle = grd
    brushContext.fillRect(0, 0, brushCanvas.width, brushCanvas.height)
    brushImages[i] = brushContext.canvas
  }
  module.exports.emit('setBrushColor', color)
}

let init = (parentDiv, layerNameArray, size)=> {
  console.log("INIT!!!")
  if (!boardContext) {

    boardSize = size
    parentDiv = parentDiv
    var container = document.createElement("div")
    container.id = 'canvas-container'
    container.style.width = size[0] + 'px'
    container.style.height = size[1] + 'px'


    for (var i = 0; i < layerNameArray.length; i++) {
      //console.log("creating layer: " + layerNameArray[i])
      var layer = document.createElement('canvas')
      layer.id = layerNameArray[i] + '-canvas'
      layer.width = size[0]
      layer.height = size[1]
      layer.style.zIndex = 100 + (i*2)
      container.appendChild(layer)
    }
    // add draw layer
    var layer = document.createElement('canvas')
    layer.id = 'draw-canvas'
    layer.width = size[0]
    layer.height = size[1]
    container.appendChild(layer)
    // add caption div
    var caption = document.createElement('div')
    caption.id = 'canvas-caption'
    parentDiv.appendChild(caption)

    // TODO: add onion skin container
    // TODO: add guides container
    parentDiv.appendChild(container)

    cursorDiv = document.createElement('div')
    cursorDiv.id = 'cursor'
    cursorDiv.style.zIndex = 200
    cursorDiv.style.width = '100px'
    cursorDiv.style.height = '100px'
    parentDiv.appendChild(cursorDiv)

    boardContext = document.getElementById('main-canvas').getContext('2d')
    drawContext = document.getElementById('draw-canvas').getContext('2d')
    sizeCanvas()
    setBrush(brushSize, brushColor, brushOpacity, layerOpacity, 'main')

    parentDiv.addEventListener('pointerdown', pointerDown, false)
    // parentDiv.addEventListener("mousewheel", mouseWheel, false);
    window.addEventListener('pointermove', pointerMove, { passive: true })
    window.addEventListener('pointerup', pointerUp, false)
    window.addEventListener('resize', sizeCanvas, false)
    window.addEventListener('keyup', keyUp, false)
    window.addEventListener("keydown", keyDown, false)
  }
}

let keyUp = (e)=> {
  if (e.key == 'Shift') {
    lastPlotPoint = []
  }
}

let keyDown = (e)=> {
  if (e.key == 'Shift') {
    lastPlotPoint = []
  }
}

let mouseWheel = (e)=> {
  // TODO figure out math to center on scale point
  var scale = viewportScale
  if (e.deltaY > 0) {
    scale = scale * 0.9
  } else {
    scale = scale * 1.1
  }

  if (scale <= 1) {
    viewportCenter = [0.5,0.5]
  } else {
    var canvasRect = document.querySelector('#canvas-container').getBoundingClientRect()
    var canvasDiv = document.querySelector('#main-canvas')
    var currentPoint = [(e.clientX-canvasRect.left)*(canvasDiv.width/canvasRect.width)/canvasDiv.width, (e.clientY-canvasRect.top)*(canvasDiv.height/canvasRect.height)/canvasDiv.height]
    console.log(currentPoint)
    viewportCenter = [(currentPoint[0]+0.5)/2, (currentPoint[1]+0.5)/2]
  }

  scale = Math.min(Math.max(scale, 0.5), 2.5)
  setScale(scale)
}

let pointerDown = (e) => {
  if (e.shiftKey) {

  } else {
    lastPlotPoint = getPointerData(e).point
  }

  if (e.altKey && !e.metaKey && !e.ctrlKey) {
    // pick image color
    lineDistance = 0
    var cursorLoc = getPointerData(e).point
    var destContext = document.createElement('canvas').getContext('2d')
    destContext.canvas.width = 1
    destContext.canvas.height = 1
    destContext.drawImage(boardContext.canvas, -cursorLoc[0], -cursorLoc[1])
    pixelVal = destContext.getImageData(0,0, 1, 1).data
    module.exports.emit('pickColor', pixelVal)
  } else {
    pointArray = [getPointerData(e)]
    previousPenAttributes = getPointerData(e)
    lastProcessedPoint = 0
    lineDistance = 0
    penDown = true
    if (scaleMode || ((e.metaKey || e.ctrlKey) && e.altKey)) {
      isMoving = true
      if ((e.metaKey || e.ctrlKey) && !e.altKey) {
        window.requestAnimationFrame(drawMoveLoop)
      } else {
        window.requestAnimationFrame(drawScaleLoop)
      }
    } else if (moveMode || (e.metaKey || e.ctrlKey)) {
      isMoving = true
      window.requestAnimationFrame(drawMoveLoop)
    } else {
      if (e.shiftKey) isStraightline = true
      window.requestAnimationFrame(drawBrushLoop)
    }
  }
}

let drawBrushLoop = (timestamp)=> {
  if (!penDown) return;
  window.requestAnimationFrame(drawBrushLoop)
  //console.log(prevTimestamp-timestamp)
  prevTimestamp = timestamp
  drawBrush()
}

let drawMoveLoop = (timestamp)=> {
  if (isMoving) {
    let cursorLoc = [-99999,-99999]
    if (pointArray[pointArray.length-1]){
      let a = (pointArray[0].point)
      let b = (pointArray[pointArray.length-1].point)
      cursorLoc = [Math.floor(b[0]-a[0]), Math.floor(b[1]-a[1])]
    }
    if (penDown) window.requestAnimationFrame(drawMoveLoop)
    drawContext.clearRect(0, 0, boardSize[0], boardSize[1])
    drawContext.drawImage(boardContext.canvas, cursorLoc[0],cursorLoc[1])
  }
}

let drawScaleLoop = (timestamp)=> {
  if (isMoving) {
    let cursorLoc = [-99999,-99999]
    let scale = 1
    let translationPoint = [-999999,999999]
    if (pointArray[pointArray.length-1]){
      let a = (pointArray[0].point)
      let b = (pointArray[pointArray.length-1].point)
      cursorLoc = [Math.floor(b[0]-a[0]), Math.floor(b[1]-a[1])]
      scale = 1+ cursorLoc[1] * 0.01
      translationPoint = [pointArray[0].point[0], pointArray[0].point[1]]
    }
    if (penDown) window.requestAnimationFrame(drawScaleLoop)
    drawContext.clearRect(0, 0, boardSize[0], boardSize[1])
    drawContext.save()
    drawContext.translate(translationPoint[0], translationPoint[1])
    drawContext.scale(scale, scale)
    drawContext.translate(-translationPoint[0], -translationPoint[1])
    drawContext.drawImage(boardContext.canvas, 0,0)
    drawContext.restore()
  }
}

let drawBrush = (lastBit)=> {
  
  if (isStraightline && (straightDirection == false)) {
    // TODO: Could be optimized, also check for nearest angle
    if (pointArray[pointArray.length-1]){
      let a = (pointArray[0].point)
      let b = (pointArray[pointArray.length-1].point)
      let dist = Math.floor(Math.sqrt(Math.pow(a[0]-b[0],2)+Math.pow(a[1]-b[1],2)))
      if (dist > 20) {
        cursorLoc = [Math.floor(b[0]-a[0]), Math.floor(b[1]-a[1])]
        if (Math.abs(cursorLoc[0]) > Math.abs(cursorLoc[1])) {
          straightDirection = 1
          straightAnchor = a[1]
        } else {
          straightDirection = 2
          straightAnchor = a[0]
        }
      }
    }
  }

  if (isStraightline) {
    if (straightDirection) {
      for (let penAttributes of pointArray) {
        let currentPoint = penAttributes.point
        if (straightDirection == 1) {
          currentPoint[1] = straightAnchor
        } else {
          currentPoint[0] = straightAnchor
        }
        drawLine(drawContext, lastPlotPoint, currentPoint, previousPenAttributes, penAttributes)
        lastPlotPoint = currentPoint
        previousPenAttributes = penAttributes
      }
      pointArray = []
    } else {
      // draw some straight lines
      let penAttributes = pointArray[0]
      penAttributes.pressure = 0.7
      previousPenAttributes.pressure = 0.7
      drawLine(drawContext, lastPlotPoint, penAttributes.point, previousPenAttributes, penAttributes)
      var pointDistance = distance(lastPlotPoint,penAttributes.point)
      if (!isNaN(pointDistance)) lineDistance += pointDistance
      lastPlotPoint = pointArray[0].point
      previousPenAttributes = penAttributes
    }
  } else {
    // draw regular
  }

  if (pointArray.length > 0 && ((pointArray.length-2-lastProcessedPoint) > 2 || lastBit)) {
    drawContext.globalCompositeOperation = 'darken'
    var points = []
    for (var i = Math.max(lastProcessedPoint-2,0); i < pointArray.length; i++) {
      points.push(pointArray[i].point[0])
      points.push(pointArray[i].point[1])
    }
    var segments = 8
    var out = getCurvePoints(points, 0.3, segments, false)
    var endUnit
    if (lastBit) {
      endUnit = out.length
    } else {
      endUnit = out.length-(segments*2*2)
    }
    // TODO 
    // simplify line by only taking points that are greater than the distance sqrt(2)
    // also embed the point information (pressure, etc)
    for (var z = (segments*2); z < endUnit; z+=2) {
      var pointDistance = distance(lastPlotPoint,[out[z],out[z+1]])
      if (pointDistance > 1.412 || lastBit) {
        lineDistance += pointDistance
        var index = Math.min(lastProcessedPoint+Math.ceil((z-8)/segments/2), pointArray.length-1)
        var penAttributes = pointArray[index]
        //drawContext.lineTo(out[z],out[z+1]);
        //drawContext.drawImage(brushImages[Math.floor(pressure*255)], out[z],out[z+1], 4, 4)
        drawLine(drawContext, lastPlotPoint, [out[z],out[z+1]], previousPenAttributes, penAttributes)
        lastPlotPoint = [out[z],out[z+1]]
        previousPenAttributes = penAttributes
      }
    }
    lastProcessedPoint = i-2
  }
}

let drawLine = (context, point1, point2, penattributes1, penattributes2)=> {
  drawContext.globalCompositeOperation = 'darken'
  let dist = Math.max(Math.floor((Math.sqrt(Math.pow(point2[0]-point1[0],2)+Math.pow(point2[1]-point1[1],2)))/1.00),1)
  for (var i=0;i<=dist;i++) {
    var angle     = penattributes1.angle + ((penattributes2.angle - penattributes1.angle)*(i/dist))
    var angle     = penattributes1.angle
    var tilt      = penattributes1.tilt  + ((penattributes2.tilt  - penattributes1.tilt)*(i/dist))
    var pressure  = penattributes1.pressure  + ((penattributes2.pressure  - penattributes1.pressure)*(i/dist))
    var eraser    = penattributes2.eraser
    var x = (point2[0]-point1[0])*(i/(dist))+point1[0]
    var y = (point2[1]-point1[1])*(i/(dist))+point1[1]
    var blend = 0
    if (eraser) {
      boardContext.globalCompositeOperation = 'destination-out'
      var size = (36 * pressure)
      boardContext.globalAlpha = 1
      blend = 1
    } else {
      var size = 1 + 2 * brushSize * Math.pow(pressure, 1.2)
      blend = ((1-tilt)*pressure) + (brushOpacity/100)
    }
    var b = Math.min(Math.floor(blend*255),240)
    if (b) {
      drawRotatedImage(brushImages[b], x, y, angle, size+(size*tilt*2), size, eraser)
    }
  }
}

let drawRotatedImage = (image, x, y, angle, w, h, eraser)=> {
  var layer = drawContext
  if (eraser) {
    var layer = boardContext
  } else {
    var layer = drawContext
  }
  layer.save()
  layer.translate(x, y)
  layer.rotate(angle * TO_RADIANS)
  layer.drawImage(image, -(w/2), -(h/2), w, h)
  layer.restore()
}

let distance = (point1, point2) => {
  return Math.hypot(point2[0]-point1[0], point2[1]-point1[1])
}

let pointerMove = (e) => {
  let sketchPaneDiv = document.querySelector('#sketch-pane')
  cursorDiv.style.left = (e.clientX-(cursorDiv.getBoundingClientRect().width/2)-sketchPaneDiv.getBoundingClientRect().left) + 'px'
  cursorDiv.style.top = (e.clientY-(cursorDiv.getBoundingClientRect().height/2)-sketchPaneDiv.getBoundingClientRect().top) + 'px'
  if (penDown) {
    pointArray.push(getPointerData(e))
  }
}

let pointerUp = (e) => {
  if (straightDirection && (e.shiftKey == true)) {
    lastPlotPoint = []
  }
  isStraightline = false
  straightDirection = false
  straightAnchor = false
  if (penDown) {
    addToUndoStack(true)
    if (moveMode || isMoving) {
      isMoving = false
      boardContext.clearRect(0, 0, boardSize[0], boardSize[1])
      stampLayer(true)
    } else {
      if (e.altKey && !e.metaKey && !e.ctrlKey) {
      } else {
        //pointArray.push(getPointerData(e))
        //drawBrush(true)
        stampLayer()
      }
    }
    module.exports.emit('markDirty')
    module.exports.emit('lineMileage', Math.round(lineDistance))
    addToUndoStack()
  }
  penDown = false
}

let stampLayer = (moving)=> {
  if (moving) {
    boardContext.globalAlpha = 1
    boardContext.globalCompositeOperation = 'copy'
  } else {
    boardContext.globalAlpha = layerOpacity/100
    boardContext.globalCompositeOperation = 'multiply'
  }
  boardContext.drawImage(drawContext.canvas, 0, 0)
  drawContext.globalAlpha = 1
  drawContext.clearRect(0, 0, boardSize[0], boardSize[1])
}

let getPointerData = (e)=> {
  var canvasRect = document.querySelector('#canvas-container').getBoundingClientRect()
  var canvasDiv = document.querySelector('#main-canvas')
  var currentPoint = [(e.clientX-canvasRect.left)*(canvasDiv.width/canvasRect.width), (e.clientY-canvasRect.top)*(canvasDiv.height/canvasRect.height)]
  var angle
  var tilt
  var pressure
  var eraser
  var pointerType
  if (e.pointerType == 'pen') {
    angle = 0
    tilt = 0
    if (tilt == 0) {
      tilt = 0.5
    }
    pressure = e.pressure
    eraser = e.buttons == 2 || eraserMode
    pointerType = 1
  } else {
    angle = 0
    tilt = 0.1
    pressure = 1.5
    eraser = e.buttons == 2 || eraserMode
    pointerType = 0
  }
  var penAttributes = {point: currentPoint, angle: angle, tilt: tilt, pressure: pressure, eraser: eraser, pointerType: pointerType}
  return penAttributes
}

let sizeCanvas= () => {
  // todo: figure out real pan values
  // thought: pan over to keep viewport centerpoint
  let canvasDiv = document.querySelector('#main-canvas')
  let captionDiv = document.querySelector('#canvas-caption')
  let canvasContainerDiv = document.querySelector('#canvas-container')
  let sketchPaneDiv = document.querySelector('#sketch-pane')

  let canvasAspect = canvasDiv.width/canvasDiv.height
  let sketchPaneAspect = (sketchPaneDiv.offsetWidth-(paneMargin*2))/(sketchPaneDiv.offsetHeight-(paneMargin*2))

  let realScale

  if (canvasAspect >= sketchPaneAspect) {
    let width = (sketchPaneDiv.offsetWidth-(paneMargin*2))*viewportScale
    realScale = width / canvasDiv.width
  } else {
    let height = (sketchPaneDiv.offsetHeight-(paneMargin*2))*viewportScale
    realScale = height / canvasDiv.height
  }

  let left = (((sketchPaneDiv.offsetWidth) - (canvasDiv.width*realScale))/2)+((0.5-viewportCenter[0])*(canvasDiv.width*realScale))
  let top = (((sketchPaneDiv.offsetHeight) - (canvasDiv.height*realScale))/2)+((0.5-viewportCenter[1])*(canvasDiv.height*realScale)) 
  canvasContainerDiv.style.transform = `translate(${left}px,${top}px) scale(${realScale},${realScale})`

  captionDiv.style.bottom = top + 20 + 'px'

  setCursorSize()
}

let setScale = (scale)=> {
  viewportScale = scale
  if (scale <= 1) {
    viewportCenter = [0.5,0.5]
  }
  sizeCanvas()
  setCursorSize()
}

let flipBoard = (vertical)=> {
  addToUndoStack(true)
  boardContext.globalAlpha = 1
  boardContext.globalCompositeOperation = 'copy'
  if (vertical) {
    boardContext.translate(0,boardContext.canvas.height)
    boardContext.scale(1, -1)
  } else {
    boardContext.translate(boardContext.canvas.width,0)
    boardContext.scale(-1, 1)
  }
  boardContext.drawImage(boardContext.canvas,0,0)
  boardContext.setTransform(1, 0, 0, 1, 0, 0)
  module.exports.emit('markDirty')
  addToUndoStack()
}

let changeBrushSize = (direction)=> {
  if (direction > 0) {
    setBrushSize(brushSize * 1.2)
  } else {
    setBrushSize(brushSize * 0.8)
  }
}

let setCursorSize = ()=> {
  var cursorLoc = cursorDiv.getBoundingClientRect()
  var boardScale = boardContext.canvas.getBoundingClientRect().width / boardContext.canvas.width
  var cursorSize = ((brushSize*3*(boardScale*2))+3)
  let sketchPaneDiv = document.querySelector('#sketch-pane')
  //cursorDiv.style.left = (e.clientX-(cursorDiv.getBoundingClientRect().width/2)) + 'px'
  cursorDiv.style.width = cursorSize + 'px'
  cursorDiv.style.height = cursorSize + 'px'
  cursorDiv.style.left = cursorLoc.left + (cursorLoc.width/2) - (cursorSize/2) - sketchPaneDiv.getBoundingClientRect().left + 'px'
  cursorDiv.style.top = cursorLoc.top + (cursorLoc.height/2) - (cursorSize/2) - sketchPaneDiv.getBoundingClientRect().top + 'px'
}

let setBrushSize = (size)=> {
  brushSize = size
  setCursorSize()
}

let setBrushOpacity = (opacity)=> {
  brushOpacity = opacity
}

let setLayerOpacity = (opacity)=> {
  layerOpacity = opacity
  drawContext.canvas.style.opacity = (layerOpacity/100)
}

let setBrush = (size, color, opacity, layerOpacity, layer)=> {
  eraserMode = false
  setBrushSize(size)
  setBrushColor(color)
  setBrushOpacity(opacity)
  setLayerOpacity(layerOpacity)
  boardContext = document.getElementById(layer+'-canvas').getContext('2d')
  drawContext.canvas.style.zIndex = Number(document.querySelector('#' + layer + '-canvas').style.zIndex)+1
  drawContext.canvas.style.mixBlendMode = 'multiply'
}

let setEraser = ()=> {
  eraserMode = true
  moveMode = false
  scaleMode = false
  module.exports.emit('cancelTransform')
}

let clear = ()=> {
  addToUndoStack(true)
  boardContext.clearRect(0, 0, boardContext.canvas.width, boardContext.canvas.height)
  module.exports.emit('markDirty')
  addToUndoStack()
}

let fill = (color = 'black') => {
  addToUndoStack(true)
  boardContext.globalCompositeOperation = 'destination-over'
  boardContext.beginPath()
  boardContext.rect(0, 0, boardContext.canvas.width, boardContext.canvas.height)
  boardContext.fillStyle = color
  boardContext.fill()
  module.exports.emit('markDirty')
  addToUndoStack()
}

let moveContents = ()=> {
  moveMode = true
  scaleMode = false
  module.exports.emit('scaleMode', scaleMode)
  module.exports.emit('moveMode', moveMode)
}

let scaleContents = ()=> {
  scaleMode = true
  moveMode = false
  module.exports.emit('moveMode', moveMode)
  module.exports.emit('scaleMode', scaleMode)
}

const cancelTransform = () => {
  moveMode = false
  scaleMode = false
  module.exports.emit('cancelTransform')
}

let addToUndoStack = (isBefore = false) => {
  let el = document.createElement('canvas')
  let ctx = el.getContext('2d')
  el.id = util.uidGen(5)
  ctx.canvas.width = boardSize[0]
  ctx.canvas.height = boardSize[1]
  ctx.drawImage(boardContext.canvas, 0, 0)

  module.exports.emit('addToUndoStack', isBefore, boardContext.canvas.id, ctx.canvas)
}

module.exports.init = init
module.exports.sizeCanvas = sizeCanvas
module.exports.setScale = setScale
module.exports.flipBoard = flipBoard
module.exports.setBrush = setBrush
module.exports.setBrushColor = setBrushColor
module.exports.setBrushSize = setBrushSize
module.exports.changeBrushSize = changeBrushSize
module.exports.setBrushOpacity = setBrushOpacity
module.exports.setLayerOpacity = setLayerOpacity
module.exports.setEraser = setEraser
module.exports.clear = clear
module.exports.fill = fill
module.exports.moveContents = moveContents
module.exports.scaleContents = scaleContents
module.exports.cancelTransform = cancelTransform
