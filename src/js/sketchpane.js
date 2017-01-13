/*

TODO:
  undo
  clear
  pan / scale = command
  straight line with = shift
  pencil = b
  brush = b

  bracket size brush

  color selection

  color picker = option

  cursor size

  copy / paste

*/

const EventEmitter = require('events').EventEmitter
module.exports = new EventEmitter()

require('./vendor/jsBezier.js')




const TO_RADIANS = Math.PI/180
const TO_DEGREES = 1 / TO_RADIANS
const MAXUNDOS = 100

let boardContext = document.getElementById('board-canvas').getContext('2d')
let drawContexts = []

let boardSize = [boardContext.canvas.width, boardContext.canvas.height]

let requestAnimationFrameID
let scaleFactor
let penOffset = []
let previousLoc = []
let moveMode = false
let scaleMode = false
let isMoving = false
let isStraightline = false
let straightDirection = false
let straightAnchor = false
let penDown = false
let mousePressure = 0.5
let pointerBuffer = []
let brushProperties = {size: window.devicePixelRatio*2, opacity: 20}
let eraserMode = false

//brushProperties = {size: window.devicePixelRatio*2, opacity: 50}
//brushProperties = {size: window.devicePixelRatio*12, opacity: 0}

brushColor = [0,0,0]

let brushImgs = []
let brushCount = 256

let undoStack = []

let undoPosition = 0



let drawCanvas = document.createElement('canvas')
drawCanvas.width = boardContext.canvas.width
drawCanvas.height = boardContext.canvas.height
drawContexts.push(drawCanvas.getContext('2d'))
drawContexts.push(document.getElementById('drawing-canvas').getContext('2d'))

let init = ()=> {
  boardContext = document.getElementById('board-canvas').getContext('2d')
  boardSize = [boardContext.canvas.width, boardContext.canvas.height]
  drawCanvas.width = boardContext.canvas.width
  drawCanvas.height = boardContext.canvas.height
}



for (var i=0;i<brushCount;i++) {
  let brushCanvas = document.createElement('canvas')
  brushCanvas.width = brushCanvas.height = 30
  let brushContext = brushCanvas.getContext('2d')
  let grd = brushContext.createRadialGradient(
    brushCanvas.width / 2, brushCanvas.height / 2,
    brushCanvas.width / 4,
    brushCanvas.width / 2, brushCanvas.height / 2,
    brushCanvas.width / 2)
  let greyval = 255-Math.floor((i/brushCount)*255)
  grd.addColorStop(0,"rgba(" + greyval + "," + greyval + "," + greyval + ",1)")
  grd.addColorStop(1,"rgba(" + greyval + "," + greyval + "," + greyval + ",0)")
  brushContext.fillStyle = grd
  brushContext.fillRect(0, 0, brushCanvas.width, brushCanvas.height)
  brushImgs.push(brushContext.canvas)
}

let pointerMove = (e)=> {
  if (penDown) {
    let penAttributes = getPointerData(e)
    pointerBuffer.push(penAttributes)
  }
}

let pointerUp = (e)=> {
  //window.cancelAnimationFrame(requestAnimationFrameID)
  if (penDown) {
    penDown = false
    isStraightline = false
    straightDirection = false
    straightAnchor = false
    if (moveMode || isMoving) {
      isMoving = false
      boardContext.clearRect(0, 0, boardSize[0], boardSize[1])
    }
    stampLayer()
    module.exports.emit('markDirty');
    pointerBuffer = []
  }
}

let stampLayer = ()=> {
  boardContext.globalAlpha = 1
  //boardContext.globalCompositeOperation = 'destination-over'
  boardContext.globalCompositeOperation = 'source-over'
  //boardContext.globalCompositeOperation = 'overlay'
  boardContext.drawImage(drawContexts[1].canvas, 0, 0)

  drawContexts[0].clearRect(0, 0, drawContexts[1].canvas.width, drawContexts[1].canvas.height)
  drawContexts[1].clearRect(0, 0, drawContexts[1].canvas.width, drawContexts[1].canvas.height)
}

let pointerDown = (e)=> {
  //console.log(e)
  if (scaleMode || (e.metaKey && e.altKey)) {
    isMoving = true
    if (e.metaKey && !e.altKey) {
      window.requestAnimationFrame(drawMoveLoop)
    } else {
      window.requestAnimationFrame(drawScaleLoop)
    }
  } else if (moveMode || e.metaKey) {
    isMoving = true
    window.requestAnimationFrame(drawMoveLoop)
  } else {
    if (e.shiftKey) isStraightline = true
    window.requestAnimationFrame(drawBrushLoop)
  }

  let rect = document.getElementById('canvas-container').getBoundingClientRect()
  let canvasDiv = document.getElementById('board-canvas')

  scaleFactor = (canvasDiv.height/rect.height)
  penOffset = [rect.left, rect.top]
  previousPenAttributes = getPointerData(e)
  previousLoc = [previousPenAttributes.point]
  penDown = true

  // check if current color is darker than current spot
  // if so, draw under
  // if not, draw over

  addToUndoStack()
}





let animationFrameTimeStamp = 0

let drawScaleLoop = (timestamp)=> {
  if (isMoving) {
    console.log("draw scale loop")
    //console.log(penOffset)
    let cursorLoc = [-99999,-99999]
    let scale = 1
    let translationPoint = [-999999,999999]

    if (pointerBuffer[pointerBuffer.length-1]){
      let a = (pointerBuffer[0].point)
      let b = (pointerBuffer[pointerBuffer.length-1].point)
      cursorLoc = [Math.floor(b[0]-a[0]), Math.floor(b[1]-a[1])]
      scale = 1+ cursorLoc[1] * 0.01
      translationPoint = [pointerBuffer[0].point[0], pointerBuffer[0].point[1]]
    } 
    if (penDown) window.requestAnimationFrame(drawScaleLoop)
    drawContexts[1].clearRect(0, 0, boardSize[0], boardSize[1])
    drawContexts[1].save()
    drawContexts[1].translate(translationPoint[0], translationPoint[1])
    drawContexts[1].scale(scale, scale)
    drawContexts[1].translate(-translationPoint[0], -translationPoint[1])
    drawContexts[1].drawImage(boardContext.canvas, 0,0) 
    drawContexts[1].restore()
  }
}




let drawMoveLoop = (timestamp)=> {
  console.log("draw move loop")
  //console.log(penOffset)
  let cursorLoc = [-99999,-99999]
  if (pointerBuffer[pointerBuffer.length-1]){
    let a = (pointerBuffer[0].point)
    let b = (pointerBuffer[pointerBuffer.length-1].point)
    cursorLoc = [Math.floor(b[0]-a[0]), Math.floor(b[1]-a[1])]
  } 
  if (penDown) window.requestAnimationFrame(drawMoveLoop)
  drawContexts[1].clearRect(0, 0, boardSize[0], boardSize[1])
  drawContexts[1].drawImage(boardContext.canvas, cursorLoc[0],cursorLoc[1]) 
}



let drawBrushLoop = (timestamp)=> {
  //window.cancelAnimationFrame(requestAnimationFrameID)
  if (penDown) window.requestAnimationFrame(drawBrushLoop)
  if ((timestamp - animationFrameTimeStamp) > 2 ) {
    console.log(timestamp - animationFrameTimeStamp)
    animationFrameTimeStamp = timestamp
    drawBrush()
  }
}



let drawBrush = ()=> {
  console.log("called draw brush")

  if (isStraightline && (straightDirection == false)) {
    console.log("STRAIGHT LINE!")

    if (pointerBuffer[pointerBuffer.length-1]){
      let a = (pointerBuffer[0].point)
      let b = (pointerBuffer[pointerBuffer.length-1].point)
      let dist = Math.floor(Math.sqrt(Math.pow(a[0]-b[0],2)+Math.pow(a[1]-b[1],2)))

      if (dist > 10) {
        console.log(dist)
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
      for (let penAttributes of pointerBuffer) {
        let currentPoint = penAttributes.point

        if (straightDirection == 1) {
          currentPoint[1] = straightAnchor
        } else {
          currentPoint[0] = straightAnchor
        }

        drawLine(drawContexts[0], previousLoc[previousLoc.length-1], currentPoint, previousPenAttributes, penAttributes)
        previousLoc.push(currentPoint)
        previousPenAttributes = penAttributes
      }
      pointerBuffer = []


    }


  } else {
    for (let penAttributes of pointerBuffer) {
      let currentPoint = penAttributes.point
      let dist = Math.floor(Math.sqrt(Math.pow(previousLoc[previousLoc.length-1][0]-currentPoint[0],2)+Math.pow(previousLoc[previousLoc.length-1][1]-currentPoint[1],2)))
      if (dist > 0 && ((currentPoint[0] !== previousLoc[previousLoc.length-1][0]) || penAttributes.pointerType == 0 )) {
        if (previousLoc.length > 1 && dist > 3) {
          let curve = []
          curve.push({x: previousLoc[previousLoc.length-1][0], y: previousLoc[previousLoc.length-1][1]})
          let midX = previousLoc[previousLoc.length-1][0] + ((previousLoc[previousLoc.length-1][0] - previousLoc[previousLoc.length-2][0]) * 0.2) + ((currentPoint[0] - previousLoc[previousLoc.length-1][0]) * 0.2)
          let midY = previousLoc[previousLoc.length-1][1] + ((previousLoc[previousLoc.length-1][1] - previousLoc[previousLoc.length-2][1]) * 0.2) + ((currentPoint[1] - previousLoc[previousLoc.length-1][1]) * 0.2)
          curve.push({x: midX, y: midY})
          curve.push({x: currentPoint[0], y: currentPoint[1]})
          drawCurve(curve, Math.max(Math.floor(dist/8), 2), penAttributes, previousPenAttributes)
        } else {
          drawLine(drawContexts[0], previousLoc[previousLoc.length-1], currentPoint, previousPenAttributes, penAttributes)
        }
        previousLoc.push(currentPoint)
        previousPenAttributes = penAttributes
      }
    }
    pointerBuffer = []
  }


  renderDrawingLayer(brushColor)
}

// THIS IS FOR OPTIMIZATION
let pix
let imageData
let targetImageData

let renderDrawingLayer = (color)=> {
  console.log("called renderDrawingLayer")
  imageData = drawContexts[0].getImageData(0,0,boardSize[0],boardSize[1])
  targetImageData = drawContexts[1].createImageData(boardSize[0],boardSize[1])
  //let targetImageData = imageData
  pix = targetImageData.data;
  for (var i = 0; i < pix.length; i += 4) {
    pix[i  ] = color[0]
    pix[i+1] = color[1] 
    pix[i+2] = color[2] 
    if (imageData.data[i] == 0){
      pix[i+3] = 0
    } else {
      pix[i+3] = (255-imageData.data[i]) * (imageData.data[i+3]/256) // alpha channel
    }
  }
  drawContexts[1].putImageData(targetImageData, 0,0)
  pix = null
}

let drawCurve = (curve, subDivs, penattributes1, penattributes2)=> {
  let angleDelta     = (penattributes2.angle - penattributes1.angle)
  let tiltDelta      = (penattributes2.tilt  - penattributes1.tilt)
  let pressureDelta  = (penattributes2.pressure  - penattributes1.pressure)
  let eraser         = penattributes2.eraser
  let tpenAttributes2
  let prevp
  for (var i=0;i<=subDivs;i++) {
    let point = jsBezier.pointOnCurve(curve, (i/subDivs))
    let angle = penattributes1.angle + ((angleDelta/subDivs)*i)
    angle = penattributes1.angle
    let tilt = penattributes1.tilt + ((tiltDelta/subDivs)*i)
    let pressure = penattributes1.pressure + ((pressureDelta/subDivs)*i)
    let tpenAttributes1 = {angle: angle, tilt: tilt, pressure: pressure, eraser: eraser}
    if (i>0) {
      drawLine(drawContexts[0], [point.x, point.y], [prevp.x, prevp.y], tpenAttributes1, tpenAttributes2)
    }
    prevp = point
    tpenAttributes2 = tpenAttributes1
  }
}

let drawLine = (context, point1, point2, penattributes1, penattributes2)=> {
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
      var size = (36 * window.devicePixelRatio * pressure)
      boardContext.globalAlpha = 1
      blend = 1
    } else {
      drawContexts[0].globalCompositeOperation = 'darken'
      var size = 1 + 2 * brushProperties.size * Math.pow(pressure, 1.2)
      blend = ((1-tilt)*pressure) +(brushProperties.opacity/100)
      drawContexts[0].globalAlpha = 1
    }
    var b = Math.min(Math.floor(blend*255),240)
    if (b) {
      drawRotatedImage(brushImgs[b], x, y, angle, size+(size*tilt*2), size, eraser)
    }
  }
}

let drawRotatedImage = (image, x, y, angle, w, h, eraser)=> { 
  if (eraser) {
    var layer = boardContext
  } else {
    var layer = drawContexts[0]
  }
  layer.save()
  layer.translate(x, y)
  layer.rotate(angle * TO_RADIANS)
  layer.drawImage(image, -(w/2), -(h/2), w, h)
  layer.restore()
}


let getPointerData = (e)=> {
  let tabX = e.clientX
  let tabY = e.clientY
  let currentPoint = [(tabX - penOffset[0])*scaleFactor, (tabY - penOffset[1])*scaleFactor]
  let angle
  let tilt
  let pressure
  let eraser
  let pointerType
  if (e.pointerType == 'pen') {
    angle = Math.atan2(e.tiltY, e.tiltX) * TO_DEGREES
    tilt = Math.max(Math.abs(e.tiltY),Math.abs(e.tiltX))
    if (tilt == 0) {
      tilt = 0.5
    }
    pressure = e.pressure
    eraser = e.buttons == 2 || eraserMode
    pointerType = 1
  } else {
    angle = 0
    tilt = 0.1
    pressure = mousePressure
    eraser = e.buttons == 2 || eraserMode
    pointerType = 0
  }
  let penAttributes = {point: currentPoint, angle: angle, tilt: tilt, pressure: pressure, eraser: eraser, pointerType: pointerType}
  return penAttributes
}

document.getElementById('sketch-pane').addEventListener('pointerdown', pointerDown, false)
window.addEventListener('pointermove', pointerMove, { passive: true });
window.addEventListener('pointerup', pointerUp, false);

// undo stuff

let addToUndoStack = ()=> {
  if (undoPosition != 0) {
    var len = undoStack.length
    undoStack = undoStack.slice(0, len-undoPosition)
    undoPosition = 0
  }
  if (undoStack.length >= MAXUNDOS) {
    undoStack = undoStack.slice(1, undoStack.length)
  }
  undoStack.push([boardContext.getImageData(0,0,boardSize[0],boardSize[1]), 1])
  //contexts[layer].putImageData(undoStack[undoStack.length-1][0], 0,0);
}

let undo = ()=> {
  if (undoPosition == 0) {
    addToUndoStack()
    undoPosition++
  }
  if (undoStack.length-undoPosition > 0) {
    undoPosition++
    var undoState = undoStack[undoStack.length-undoPosition]
    boardContext.putImageData(undoState[0], 0,0);
  } else {
  }

  //console.log(undoStack)
};

let redo = ()=> {
  if (undoStack.length-undoPosition < undoStack.length-1) {
    undoPosition--
    var undoState = undoStack[undoStack.length-undoPosition]
    boardContext.putImageData(undoState[0], 0,0)
  } else {
  }
}





let setBrush = (size, opacity)=> {
  moveMode = false
  scaleMode = false
  eraserMode = false
  brushProperties = {size: window.devicePixelRatio*size, opacity: opacity}
}

let setBrushSize = (direction)=> {
  if (direction > 0) {
    brushProperties.size = brushProperties.size * 1.2
  } else {
    brushProperties.size = brushProperties.size * 0.8
  }
}


let setColor = (color)=> {
  brushColor = color
}

let setEraser = ()=> {
  eraserMode = true
  moveMode = false
  scaleMode = false
}

let clear = ()=> {
  addToUndoStack()
  boardContext.clearRect(0, 0, drawContexts[1].canvas.width, drawContexts[1].canvas.height)
}

let fillBlack = ()=> {
  addToUndoStack()
  boardContext.globalCompositeOperation = 'destination-over'
  boardContext.beginPath()
  boardContext.rect(0, 0, drawContexts[1].canvas.width, drawContexts[1].canvas.height)
  boardContext.fillStyle = "black"
  boardContext.fill()
}

let moveContents = ()=> {
  moveMode = true
  scaleMode = false
}

let scaleContents = ()=> {
  scaleMode = true
  moveMode = false
}



module.exports.init = init
module.exports.setBrush = setBrush
module.exports.setBrushSize = setBrushSize
module.exports.setColor = setColor
module.exports.setEraser = setEraser
module.exports.clear = clear
module.exports.fillBlack = fillBlack
module.exports.moveContents = moveContents
module.exports.scaleContents = scaleContents
module.exports.undo = undo
module.exports.redo = redo