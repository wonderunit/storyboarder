/*
  todo:
    [x] error if cant get 4 points
    error if cant get qr code
  
    see if we can speed up window open
    disable button on clicking import

    hook up offsets
    hook up crop %
    save to prefs

    dont import blanks

    [x] make work with cell phone capture
*/

const { ipcRenderer, shell } = require('electron')
const remote = require('@electron/remote')
const { app } = remote
const path = require('path')
const fs = require('fs')
const QrCode = require('qrcode-reader')

const jsfeat = require('../vendor/jsfeat-min')

const prefModule = require('@electron/remote').require('./prefs')

let sourceImage
let flatImage

let cropMarks
let code

/*
  states:
    - initializing
    - manual corner points
    - manual qr code selection
    - calibration
    - importing to main
*/

////////////////////////////////////////////////////////////////////////////////
// model
//
let model = {
  dimensions: [0, 0],
  tl: [],
  tr: [],
  br: [],
  bl: [],
  order: ['tl', 'tr', 'br', 'bl'],
  labels: ['top left', 'top right', 'bottom right', 'bottom left'],
  curr: 0,
  hasPoints: false,

  // initialize from prefs, make a copy
  offset: [
    prefModule.getPrefs().import.offset[0],
    prefModule.getPrefs().import.offset[1]
  ],
  skipBlankBoards: prefModule.getPrefs().import.skipBlankBoards,
  lastValidQrCode: prefModule.getPrefs().import.lastValidQrCode || '',

  inputLocked: true,

  // HACK
  cornerPoints: undefined,
  canvas: undefined,
  context: undefined,
  imageData: undefined,
  img_u8: undefined,

  step: 'loading',

  // for change tracking. TODO is there a better way?
  lastStep: undefined,
  lastOffset: undefined
}

model.present = data => {
  if (data.type === 'dimensions') {
    model.dimensions = data.payload
  }

  if (data.type === 'point') {
    let x = data.payload[0] / model.dimensions[0]
    let y = data.payload[1] / model.dimensions[1]
    model[model.order[model.curr]] = [x, y]
    if (model.curr === model.order.length - 1) {
      model.hasPoints = true
    } else {
      model.curr++
    }
  }

  if (data.type === 'step') {
    model.step = data.payload
  }

  if (data.type === 'resetCorners') {
    model.tl = []
    model.tr = []
    model.br = []
    model.bl = []
    model.curr = 0
    model.hasPoints = false
    model.cornerPoints = undefined
  }

  if (typeof data.offset !== 'undefined') {
    if (typeof data.offset[0] !== 'undefined') model.offset[0] = parseInt(data.offset[0], 10)
    if (typeof data.offset[1] !== 'undefined') model.offset[1] = parseInt(data.offset[1], 10)
  }

  if (typeof data.skipBlankBoards !== 'undefined') {
    model.skipBlankBoards = data.skipBlankBoards
  }

  if (typeof data.lastValidQrCode !== 'undefined') {
    model.lastValidQrCode = data.lastValidQrCode
  }

  if (typeof data.inputLocked !== 'undefined') {
    model.inputLocked = data.inputLocked
  }

  state.render(model)

  model.persist()
}
model.persist = () => {
  prefModule.set('import', {
    offset: model.offset,
    skipBlankBoards: model.skipBlankBoards,
    lastValidQrCode: model.lastValidQrCode
  })
}

////////////////////////////////////////////////////////////////////////////////
// View
//
let view = {}
view.init = (model) => {
  return view.loading(model)
}
view.reset = (model) => {
  let previewEl = document.querySelector("#preview")
  previewEl.removeAttribute('src')

  return ({})
}
view.loading = (model) => {
  // TODO reset everything

  return ({
    overview: 'Loading …',
    instructions: 'Loading …'
  })
}
view.processing = (model) => {
  // TODO reset everything?

  return ({
    overview: 'Processing …',
    instructions: 'Processing …'
  })
}
view.cornerPointsEditor = (model) => {
  let container = document.getElementById("preview-pane-content")
  let titleEl = document.createElement('div')
  let previewEl = document.querySelector("#preview")

  if (model.lastStep !== model.step) {
    // attach
    previewEl.src = sourceImage.src

    model.order.map(pos => {
      let el = document.createElement('div')
      el.classList.add(`corner-point`)
      el.classList.add(`corner-point-${pos}`)
      document.getElementById('paper-2').append(el)
    })
  }

  let instructions = model.hasPoints
    ? `We got points!`
    : `Select the <b>${model.labels[model.curr]}</b> corner:`

    let tlEl = document.getElementById("paper-2").querySelector('.corner-point-tl')
    let trEl = document.getElementById("paper-2").querySelector('.corner-point-tr')
    let brEl = document.getElementById("paper-2").querySelector('.corner-point-br')
    let blEl = document.getElementById("paper-2").querySelector('.corner-point-bl')

    let scale = model.dimensions
    
    for (let [point, el, label] of [
      [model.tl, tlEl, 'tl'],
      [model.tr, trEl, 'tr'],
      [model.br, brEl, 'br'],
      [model.bl, blEl, 'bl']
    ]) {
      if (point.length) {
        el.style.left = Math.floor(point[0] * scale[0]) + 'px'
        el.style.top = Math.floor(point[1] * scale[1]) + 'px'
        el.style.visibility = 'visible'
      } else {
        el.style.visibility = 'hidden'
      }
    }

    container.style.cursor = view.hasPoints
      ? 'default'
      : 'crosshair'


  return ({
    overview: `Please select each of the 4 corners of the paper in the image.`,
    instructions
  })
}
view.qrCodeInput = (model) => {
  return ({
    overview: 'I couldn’t detect the QR code for this worksheet. ' +
              (
                model.lastValidQrCode.length
                ? 'I guessed a QR code based on the last working one you gave me. '
                : ''
              ) + 'You can find the correct QR code to the left of the QR graphic on the printed worksheet.',
    form: `
      <form onsubmit="return actions.validateQrCode()">
        <div class="row">
          <label for="qr-code">QR Code:</label>
          <input id="qr-code" type="text" value="${model.lastValidQrCode}" />
        </div>
        <div id="button-content">
          <div class="button grey" onclick="return actions.validateQrCode()">Next</div>
        </div>
      </form>
    `
  })
}
view.calibration = (model) => {
  const isSelected = (i, n) => model.offset[i] === parseInt(n, 10)
  const selectIf = (i, n) => isSelected(i, n) ? 'selected' : ''

  const optionsStr = i =>
    [-50, -40, -30, -20, -10, -5, -3, 0, 3, 5, 10, 20, 30, 40, 50].map(n =>
      `<option ${selectIf(i, n)} value="${n}">${n}</option>`
    ).join('\n')

  const disabledIfInputLocked = model.inputLocked
    ? ' disabled'
    : ''

  const buttonStr = model.inputLocked
    ? `<div class="button grey" id="import-button">Processing …</div>`
    : `<div class="button grey" id="import-button" onclick="return actions.import()">Import!</div>`

  return ({
    overview: `Woot. You made beautiful drawings on this worksheet. 
                  Now let’s get them into Storyboarder. 
                  If the boxes, look lined up, click import! 
                  Otherwise mess with the offset.`,
    form:
    `
      <div class="row row-grid">
        <div class="col">
          <label for="column-number">Offset X</label>
          <select ${disabledIfInputLocked} id="column-number" onchange="return actions.setOffset(this.value, undefined)">
            ${optionsStr(0)}
          </select>
        </div>
        <div class="col">
          <label for="row-number">Offset Y</label>
          <select ${disabledIfInputLocked} id="row-number" onchange="return actions.setOffset(undefined, this.value)">
            ${optionsStr(1)}
          </select>
        </div>
      </div>
      <div class="row">
        <input type="checkbox" ${model.skipBlankBoards ? 'checked' : ''} id="skip-blank-boards" onchange="return actions.setSkipBlankBoards(this.checked ? true : false)" />
        <label for="skip-blank-boards">
          <span></span>Skip Blank Boards
        </label>
      </div>
      <div class="row" style="margin-top: 35px;">
        <a class="link-button" href="#" onclick="return actions.onTweakCorners()">Tweak Corner Points</a>
      </div>
      <!--
      <div class="row">
        <label for="spacing">Crop in</label>
        <select name="select" id="spacing">
          <option value="15">100%</option> 
          <option value="20">80%</option>
          <option value="25">120%</option> 
          <option value="30">150%</option>
        </select>
      </div>
      -->
      <div id="button-content">
        ${buttonStr}
      </div>
    `
  })
}
view.display = (representation) => {
  document.getElementById('overview').innerHTML = representation.overview || ''
  document.getElementById('step-form').innerHTML = representation.form || ''
  document.querySelector('#preview-pane-content .instructions').innerHTML = representation.instructions || ''
}

////////////////////////////////////////////////////////////////////////////////
// State
//
let state = { view: view }

// Derive the state representation as a function of the systen control state
state.representation = model => {
  let representation

  representation = state.view[model.step](model)

  state.view.display(representation)
}

state.nextAction = model => {
  // detatch if step changed
  if (model.lastStep !== model.step && model.lastStep == 'cornerPointsEditor') {
    //
    // dispose of the cornerPointsEditor view
    //
    let previewEl = document.querySelector("#preview")
    previewEl.removeAttribute('src')
    //
    // remove corner point indicators
    for (let el of document.querySelectorAll('.corner-point')) {
      el.parentNode.removeChild(el)
    }
  }

  // process if its the right time
  if (model.step == 'cornerPointsEditor' && model.hasPoints) {
    actions.step('processing')

    // allow time for DOM to render
    setTimeout(() => {
      processCornerPoints([
          model.tl,
          model.tr,
          model.br,
          model.bl
        ],
        model.canvas,
        model.context,
        model.imageData,
        model.img_u8
      )
    }, 100)
  }
  model.lastStep = model.step

  let shouldReProcess = false
  if (model.lastOffset) {
    if (
      model.lastOffset[0] !== model.offset[0] ||
      model.lastOffset[1] !== model.offset[1]
    ) {
      // offset has changed
      // trigger re-processing
      shouldReProcess = true
    }
  }
  model.lastOffset = [model.offset[0], model.offset[1]]

  if (shouldReProcess) {
    actions.setInputLocked(true)

    // allow time for DOM to render
    setTimeout(() => {
      // process
      processQrCode(
        code,
        model.cornerPoints,
        model.canvas,
        model.context,
        model.imageData,
        model.img_u8
      )
    }, 100)
  }
}

state.render = model => {
  state.representation(model)
  state.nextAction(model)
}

model.state = state

////////////////////////////////////////////////////////////////////////////////
// Actions
//
let actions = {}
actions.present = model.present
actions.step = payload => {
  actions.present({ type: 'step', payload })
}
actions.setInputLocked = inputLocked => {
  actions.present({ inputLocked })
}
actions.editCornerPoints = () => {
  ipcRenderer.send('playsfx', 'error')
  actions.onTweakCorners()
}
actions.validateQrCode = () => {
  const isNotNumber = n => Number.isNaN(parseInt(n, 10))

  // HACK setting a global
  code = document.getElementById('qr-code').value.toUpperCase().split('-')

  // e.g.: 0-LTR-5-4-15-1.778-8146
  let valid = true
  // sceneNumber
  if (isNotNumber(code[0])) valid = false
  // paperSize
  if (code[1] !== 'LTR' && code[1] !== 'A4') valid = false
  // rows
  if (isNotNumber(code[2])) valid = false
  // cols
  if (isNotNumber(code[3])) valid = false
  // spacing
  if (isNotNumber(code[4])) valid = false
  // aspectRatio
  if (isNotNumber(code[5])) valid = false

  if (valid) {
    actions.step('processing')

    // allow time for DOM to render
    setTimeout(() => {
      // process
      processQrCode(
        code,
        model.cornerPoints,
        model.canvas,
        model.context,
        model.imageData,
        model.img_u8
      )
    }, 100)
  } else {
    alert('Hmm, I couldn’t use that QR code. Are you sure you typed in the right value?')
  }

  return false
}
actions.import = () => {
  ipcRenderer.send('playsfx', 'positive')

  actions.setInputLocked(true)
  // allow DOM to render
  setTimeout(() => {
    let images = getImagesToImport({ skipBlankBoards: model.skipBlankBoards })
    importImages(images)
    actions.hideWindow()
  }, 100)

  return false
}
actions.hideWindow = () => {
  actions.resetModel()
  actions.dispose()
  actions.step('reset')

  let window = remote.getCurrentWindow()
  // wait for DOM to render
  setTimeout(() => {
    window.hide()
  }, 100)
}
actions.oResize = event => {
  actions.present({
    type: 'dimensions',
    payload: [
      document.querySelector("#preview").width,
      document.querySelector("#preview").height
    ]
  })
}
actions.onHideWindow = event => {
  ipcRenderer.send('playsfx', 'negative')
  actions.hideWindow()
}
actions.onPointerDown = () => {
  actions.present({ type: 'dimensions', payload: [document.querySelector("#preview").width, document.querySelector("#preview").height] })
  actions.present({ type: 'point', payload: [event.offsetX, event.offsetY] })
}
actions.onTweakCorners = event => {
  // TODO should resetCorners be part of the state transition to cornerPointsEditor ?
  actions.present({ type: 'resetCorners' })
  actions.step('cornerPointsEditor')

  // TODO necessary?
  let previewEl = document.querySelector("#preview")
  actions.present({ dimensions: [previewEl.width, previewEl.height] })

  return false
}
actions.setOffset = (x, y) => {
  actions.present({ offset: [x, y] })
  return false
}
actions.setSkipBlankBoards = skipBlankBoards => {
  actions.present({ skipBlankBoards })
  return false
}
actions.setLastValidQrCode = lastValidQrCode => {
  actions.present({ lastValidQrCode })
}
// NOTE kind of a hack, this should really go through .present
//      also, could use an initialState for this instead
actions.resetModel = () => {
  model.dimensions = [0, 0]
  model.tl = []
  model.tr = []
  model.br = []
  model.bl = []
  model.curr = 0
  model.hasPoints = false

  // model.offset = [0, 0] // never reset offset
  model.inputLocked = true

  model.cornerPoints = undefined
  model.canvas = undefined
  model.context = undefined
  model.imageData = undefined
  model.img_u8 = undefined

  model.lastStep = undefined
  model.lastOffset = undefined
}
actions.dispose = () => {
  window.removeEventListener('resize', actions.onResize)
  document.querySelector("#preview").removeEventListener('pointerdown', actions.onPointerDown)
}
actions.attach = () => {
  // TODO prevent multiple attatch?
  window.addEventListener('resize', actions.onResize)
  document.querySelector("#preview").addEventListener('pointerdown', actions.onPointerDown)
}
actions.init = () => {
  // TODO should we handle if window is hidden from outside?
  // remote.getCurrentWindow().once('hide', actions.dispose)

  //
  // on each key input,
  //   prevent application menu keyboard shortcuts
  //     so that we can type in the QR code input
  //
  // via https://electron.atom.io/docs/api/web-contents/#event-before-input-event
  //     https://github.com/electron/electron/blob/master/docs/api/web-contents.md#contentssetignoremenushortcutsignore-experimental
  //     https://github.com/electron/electron/issues/1334#issuecomment-310920998
  let win = remote.getCurrentWindow()
  win.webContents.on('before-input-event', (event, input) => {
    // only enable application menu keyboard shortcuts when Ctrl/Cmd are down
    win.webContents.setIgnoreMenuShortcuts(!input.control && !input.meta)
  })

  actions.attach()
  actions.step('init')
}

////////////////////////////////////////////////////////////////////////////////
// Actions
//
actions.init()

// // Actions -> Model
// const present = data => model.present(data)
// 
// // View -> Display
// const display = view => {



const getImagesToImport = (options = { skipBlankBoards: true }) => {
  let destCanvas = document.createElement('canvas')
  destCanvas.height = 900
  destCanvas.width = (900*Number(code[5]))
  let images = []
  for (var i = 0; i < cropMarks.length; i++) {
    destCanvas.getContext("2d").drawImage(flatImage, cropMarks[i][0]*flatImage.width+model.offset[0], cropMarks[i][1]*flatImage.height+model.offset[1], cropMarks[i][2]*flatImage.width, cropMarks[i][3]*flatImage.height, 0, 0, destCanvas.width, destCanvas.height)
    // imgData = destCanvas.toDataURL().replace(/^data:image\/\w+;base64,/, '')
    // fs.writeFileSync(path.join(app.getPath('temp'), 'crop' + i + '.png'), imgData, 'base64')

    if (!options.skipBlankBoards || checkForImageContent(destCanvas)) {
      images.push(destCanvas.toDataURL())
    } else {
      console.log('Skipping blank image', i)
    }
  }
  return images
}

const importImages = images => {
  remote.getCurrentWindow().getParentWindow().webContents.send('importFromWorksheet', images)
}



const processWorksheetImage = (imageSrc) => {
  actions.init()

  sourceImage = new Image()

  sourceImage.onload = () => {
    console.log("SOURCE IMAGE LOADED!!!!")
    console.log(app.getPath('temp'))
    // STEP
    // create a 1500px wide image to deal with
    let canvas = document.createElement('canvas')
    let imageAspect = sourceImage.width/sourceImage.height
    canvas.width = 1500
    canvas.height = Math.round(1500/imageAspect)
    let context = canvas.getContext('2d')
    context.drawImage(sourceImage, 0,0, canvas.width, canvas.height)
    let imageData = context.getImageData(0, 0, canvas.width, canvas.height)

    // STEP
    // get pixels greyscale from photo
    let img_u8 = new jsfeat.matrix_t(canvas.width, canvas.height, jsfeat.U8C1_t);
    jsfeat.imgproc.grayscale(imageData.data, canvas.width, canvas.height, img_u8);
    imageData = context.getImageData(0, 0, canvas.width, canvas.height)
    outputImage(img_u8, context, path.join(app.getPath('temp'), 'step1.png'))

    // STEP
    // gaussian blur to remove noise and small lines
    var r = 8;
    var kernel_size = (r+1) << 1;
    jsfeat.imgproc.gaussian_blur(img_u8, img_u8, kernel_size, 0);
    outputImage(img_u8, context, path.join(app.getPath('temp'), 'step2.png'))

    // STEP
    // canny edge detection to find lines
    jsfeat.imgproc.canny(img_u8, img_u8, 10, 50);
    outputImage(img_u8, context, path.join(app.getPath('temp'), 'step3.png'))

    // STEP
    // perform hough transform to find all lines greater than 250 strength
    let lines = jsfeat.imgproc.hough_transform(img_u8, 1, Math.PI/500,250)

    // STEP
    // reverse array so strongest results are first
    lines.reverse()

    // STEP
    // add each line candidtate to an array
    let lineCandidates = []
    for (let line of lines) {
      let rho = line[0]
      let theta = line[1]
      let a = Math.cos(theta)
      let b = Math.sin(theta)
      let x0 = a*rho
      let y0 = b*rho
      let x1 = Math.round(x0 + 2000*(-b))
      let y1 = Math.round(y0 + 2000*(a))
      let x2 = Math.round(x0 - 2000*(-b))
      let y2 = Math.round(y0 - 2000*(a))
      context.strokeStyle="#FF0000"
      context.beginPath()
      context.moveTo(x1, y1)
      context.lineTo(x2, y2)
      context.stroke()
      lineCandidates.push([x1, y1, x2, y2, rho, theta])
    }

    // STEP
    // remove lines that are similar angles and very close to each other. keep the most dominant line.
    for (var g = 0; g < 4; g++) {
      var lineCandidatesClone = lineCandidates.slice(0)
      for (var z = 0; z < lineCandidates.length; z++) {
        for (var y = z; y < lineCandidates.length; y++) {
          if (z !== y) {
            let line1 = lineCandidates[z]
            let line2 = lineCandidates[y]
            let anglediff = angleDistance(line1[5],line2[5])
            // distance between midpoint of 2 lines
            let point1 = [((line1[0]+line1[2])/2),((line1[1]+line1[3])/2)]
            let point2 = [((line2[0]+line2[2])/2),((line2[1]+line2[3])/2)]
            let interdiff = distance(point1[0],point1[1],point2[0],point2[1])
            //console.log(anglediff, interdiff)
            if ((anglediff < 0.1) && (interdiff < 30)) {
              if (y > z) {
                lineCandidatesClone.splice(y, 1)
              } else {
                lineCandidatesClone.splice(z, 1)
              }
              //console.log("deleted similar")
            }
          }
        }
      }
      lineCandidates  = lineCandidatesClone
      //console.log("LINES: " + lineCandidates.length)
    }

    // draw line candidates
    for (var z = 0; z < lineCandidates.length; z++) {
      let line = lineCandidates[z]
      if (z < 4) {
        context.strokeStyle="#00FF00"
      } else {
        context.strokeStyle="#0000FF"
      }
      context.beginPath()
      context.moveTo(line[0], line[1])
      context.lineTo(line[2], line[3])
      context.stroke()
    }

    // STEP
    // filter out corner points and add them to an array
    let cornerPoints = []
    if (lineCandidates.length >= 4) {
      for (var z = 0; z < 4; z++) {
        for (var y = z; y < 4; y++) {
          if (z !== y) {
            let line1 = lineCandidates[z]
            let line2 = lineCandidates[y]
            let intersect = checkLineIntersection(line1[0],line1[1],line1[2],line1[3],line2[0],line2[1],line2[2],line2[3])
            if (intersect.x) {
              if (intersect.x > 0 && intersect.y > 0 && intersect.x < context.canvas.width && intersect.y < context.canvas.height) {
                cornerPoints.push([intersect.x/context.canvas.width, intersect.y/context.canvas.height])
                context.fillStyle = 'orange';
                context.fillRect(intersect.x-3, intersect.y-3, 6, 6);
              }
            }
          }
        }
      }
    }
    let imgData = context.canvas.toDataURL().replace(/^data:image\/\w+;base64,/, '')
    fs.writeFileSync(path.join(app.getPath('temp'), 'step4.png'), imgData, 'base64')

    console.log({ cornerPoints })

    if (cornerPoints.length !== 4) {
      // if we couldn't find the points, ask the artist

      // HACK
      // we should keep these variables in the model
      // instead of creating references here
      model.cornerPoints = undefined
      model.canvas = canvas
      model.context = context
      model.imageData = imageData
      model.img_u8 = img_u8

      actions.editCornerPoints()
    } else {
      // if we detected the points,
      // ensure they're in the correct order
      cornerPoints = sortCornerPoints(cornerPoints)

      actions.step('processing')      
      processCornerPoints(cornerPoints, canvas, context, imageData, img_u8)
    }





    // // equalize
    // jsfeat.imgproc.equalize_histogram(img_u8, img_u8);
    // outputImage(img_u8, context, 'step3.png')



  }

  sourceImage.src = imageSrc[0]
}

const sortCornerPoints = (cornerPoints) => {
  let result = cornerPoints.slice(0)
  result.sort((b,a) => {
    console.log((Math.atan2(a[0]-0.5,a[1]-0.5)),(Math.atan2(b[0]-0.5,b[1]-0.5)))
    return (Math.atan2(a[0]-0.5,a[1]-0.5))-(Math.atan2(b[0]-0.5,b[1]-0.5))
  })
  result.unshift(result.pop())
  return result
}

function processCornerPoints (cornerPoints, canvas, context, imageData, img_u8) {
  // STEP
  // TODO: check the area, should error if too small or less than 4 points

  // STEP 
  // reverse warp to read qr code
  canvas.width = 2500
  canvas.height = Math.round(2500/(11/8.5))
  context = canvas.getContext('2d')
  context.drawImage(sourceImage, 0,0, canvas.width, canvas.height)
  imageData = context.getImageData(0, 0, canvas.width, canvas.height);


  img_u8 = new jsfeat.matrix_t(canvas.width, canvas.height, jsfeat.U8_t | jsfeat.C1_t);
  // img_u8_warp = new jsfeat.matrix_t(640, 480, jsfeat.U8_t | jsfeat.C1_t);
  img_u8_warp = new jsfeat.matrix_t(canvas.width, canvas.height, jsfeat.U8_t | jsfeat.C1_t);
  transform = new jsfeat.matrix_t(3, 3, jsfeat.F32_t | jsfeat.C1_t);
  jsfeat.math.perspective_4point_transform(transform, 
                                                  cornerPoints[0][0]*canvas.width,   cornerPoints[0][1]*canvas.height,   0,  0,
                                                  cornerPoints[1][0]*canvas.width,   cornerPoints[1][1]*canvas.height,   canvas.width, 0,
                                                  cornerPoints[2][0]*canvas.width,   cornerPoints[2][1]*canvas.height, canvas.width, canvas.height,
                                                  cornerPoints[3][0]*canvas.width,   cornerPoints[3][1]*canvas.height, 0, canvas.height);
  jsfeat.matmath.invert_3x3(transform, transform);

  jsfeat.imgproc.grayscale(imageData.data, canvas.width, canvas.height, img_u8);
  jsfeat.imgproc.warp_perspective(img_u8, img_u8_warp, transform, 0);

  var data_u32 = new Uint32Array(imageData.data.buffer);
  var alpha = (0xff << 24);
  var i = img_u8_warp.cols*img_u8_warp.rows, pix = 0;
  while(--i >= 0) {
    pix = img_u8_warp.data[i];
    data_u32[i] = alpha | (pix << 16) | (pix << 8) | pix;
  }
  context.putImageData(imageData, 0, 0);
  imgData = context.canvas.toDataURL().replace(/^data:image\/\w+;base64,/, '')
  fs.writeFileSync(path.join(app.getPath('temp'), 'step5.png'), imgData, 'base64')

  let qrCanvas = document.createElement('canvas')
  qrCanvas.width = 500
  qrCanvas.height = 500
  let qrContext = qrCanvas.getContext('2d')
  qrContext.drawImage(context.canvas, -context.canvas.width+500,0, context.canvas.width, context.canvas.height)
  let qrImageData = qrContext.getImageData(0, 0, qrCanvas.width, qrCanvas.height)

  var newImageData = contrastImage(qrImageData, 150)
  qrContext.putImageData(newImageData, 0, 0);
  
  imgData = qrContext.canvas.toDataURL().replace(/^data:image\/\w+;base64,/, '')
  fs.writeFileSync(path.join(app.getPath('temp'), 'step6.png'), imgData, 'base64')



  // HACK we should have these always part of the model,
  //      throughout the codebase,
  //      instead of global,
  //      so that we don't have to update references here
  model.cornerPoints = cornerPoints
  model.canvas = canvas
  model.context = context
  model.imageData = imageData
  model.img_u8 = img_u8



  var qr = new QrCode();
  qr.callback = function(err, result) { 
    console.log("GOT BACK RESULT: ", err, result )
    console.log("BEGIN CROPPING:" )
    if (err) {
      // alert(`ERROR: NO QR - ` + err)

      // because we're interrupting the flow here,
      // we had to set model.* above
      // so they're available to pass later when we resume the flow
      actions.step('qrCodeInput')
    } else {
      // if i got qr,
      code = result.result.split('-')
      processQrCode(code, cornerPoints, canvas, context, imageData, img_u8)
    }
  }
  qr.decode(qrImageData)
}

function processQrCode (code, cornerPoints, canvas, context, imageData, img_u8) {
  actions.setLastValidQrCode(code.join('-'))

  canvas.width = 2500

  // make a new image based on paper size
  // copy src image in
  if (code[1] == 'LTR') {
    canvas.height = Math.round(2500/(11/8.5))
  } else {
    canvas.height = Math.round(2500/(842/595))
  }

  context = canvas.getContext('2d')
  context.drawImage(sourceImage, 0,0, canvas.width, canvas.height)
  imageData = context.getImageData(0, 0, canvas.width, canvas.height);

  img_u8 = new jsfeat.matrix_t(canvas.width, canvas.height, jsfeat.U8_t | jsfeat.C1_t);
  img_u8_warp = new jsfeat.matrix_t(canvas.width, canvas.height, jsfeat.U8_t | jsfeat.C1_t);
  transform = new jsfeat.matrix_t(3, 3, jsfeat.F32_t | jsfeat.C1_t);
  jsfeat.math.perspective_4point_transform(transform, 
                                                  cornerPoints[0][0]*canvas.width,   cornerPoints[0][1]*canvas.height,   0,  0,
                                                  cornerPoints[1][0]*canvas.width,   cornerPoints[1][1]*canvas.height,   canvas.width, 0,
                                                  cornerPoints[2][0]*canvas.width,   cornerPoints[2][1]*canvas.height, canvas.width, canvas.height,
                                                  cornerPoints[3][0]*canvas.width,   cornerPoints[3][1]*canvas.height, 0, canvas.height);
  jsfeat.matmath.invert_3x3(transform, transform);

  jsfeat.imgproc.grayscale(imageData.data, canvas.width, canvas.height, img_u8);
  jsfeat.imgproc.warp_perspective(img_u8, img_u8_warp, transform, 0);

  var data_u32 = new Uint32Array(imageData.data.buffer);
  var alpha = (0xff << 24);
  var i = img_u8_warp.cols*img_u8_warp.rows, pix = 0;
  while(--i >= 0) {
    pix = img_u8_warp.data[i];
    data_u32[i] = alpha | (pix << 16) | (pix << 8) | pix;
  }
  context.putImageData(imageData, 0, 0);

  flatImage = document.createElement('canvas')
  flatImage.width = context.canvas.width
  flatImage.height = context.canvas.height
  flatImage.getContext('2d').drawImage(context.canvas, 0, 0)

  // get crop marks
  cropMarks = generateCropMarks(code[1], Number(code[5]), Number(code[2]), Number(code[3]), Number(code[4]))
  for (var i = 0; i < cropMarks.length; i++) {
    let fatOutline = 15
    context.lineWidth = fatOutline
    context.strokeStyle = 'rgba(20,20,200,0.1)';
    context.strokeRect(cropMarks[i][0]*canvas.width+model.offset[0]-(fatOutline/2), cropMarks[i][1]*canvas.height+model.offset[1]-(fatOutline/2), cropMarks[i][2]*canvas.width+(fatOutline*1), cropMarks[i][3]*canvas.height+(fatOutline*1))


    fatOutline = 0
    context.lineWidth = 1
    context.strokeStyle = 'rgba(20,20,200,1)';

    context.strokeRect(cropMarks[i][0]*canvas.width+model.offset[0]-fatOutline, cropMarks[i][1]*canvas.height+model.offset[1]-fatOutline, cropMarks[i][2]*canvas.width+(fatOutline*2), cropMarks[i][3]*canvas.height+(fatOutline*2))


  }

  // draw them        

  imgData = context.canvas.toDataURL().replace(/^data:image\/\w+;base64,/, '')
  fs.writeFileSync(path.join(app.getPath('temp'), 'flatpaper.png'), imgData, 'base64') // why do we write a file instead of creating in memory?

  document.querySelector("#preview").src = path.join(app.getPath('temp'), 'flatpaper.png?'+ Math.round(Math.random()*10000))

  actions.setInputLocked(false)
  actions.step('calibration')
}
function contrastImage(imageData, contrast) {

    var data = imageData.data;
    var factor = (259 * (contrast + 255)) / (255 * (259 - contrast));

    for(var i=0;i<data.length;i+=4)
    {
        data[i] = factor * (data[i] - 128) + 128;
        data[i+1] = factor * (data[i+1] - 128) + 128;
        data[i+2] = factor * (data[i+2] - 128) + 128;
    }
    return imageData;
}



const distance = ( x1, y1, x2, y2 ) => {
  
  var   xs = x2 - x1,
    ys = y2 - y1;   
  
  xs *= xs;
  ys *= ys;
   
  return Math.sqrt( xs + ys );
};

const angleDistance = (alpha, beta) => {
  let phi = Math.abs(beta - alpha) % Math.PI       // This is either the distance or 360 - distance
  let distance = phi > (Math.PI/2) ? Math.PI - phi : phi
  return distance
}



const checkLineIntersection = (line1StartX, line1StartY, line1EndX, line1EndY, line2StartX, line2StartY, line2EndX, line2EndY) => {
    // if the lines intersect, the result contains the x and y of the intersection (treating the lines as infinite) and booleans for whether line segment 1 or line segment 2 contain the point
    var denominator, a, b, numerator1, numerator2, result = {
        x: null,
        y: null,
        onLine1: false,
        onLine2: false
    };
    denominator = ((line2EndY - line2StartY) * (line1EndX - line1StartX)) - ((line2EndX - line2StartX) * (line1EndY - line1StartY));
    if (denominator == 0) {
        return result;
    }
    a = line1StartY - line2StartY;
    b = line1StartX - line2StartX;
    numerator1 = ((line2EndX - line2StartX) * a) - ((line2EndY - line2StartY) * b);
    numerator2 = ((line1EndX - line1StartX) * a) - ((line1EndY - line1StartY) * b);
    a = numerator1 / denominator;
    b = numerator2 / denominator;

    // if we cast these lines infinitely in both directions, they intersect here:
    result.x = line1StartX + (a * (line1EndX - line1StartX));
    result.y = line1StartY + (a * (line1EndY - line1StartY));
/*
        // it is worth noting that this should be the same as:
        x = line2StartX + (b * (line2EndX - line2StartX));
        y = line2StartX + (b * (line2EndY - line2StartY));
        */
    // if line1 is a segment and line2 is infinite, they intersect if:
    if (a > 0 && a < 1) {
        result.onLine1 = true;
    }
    // if line2 is a segment and line1 is infinite, they intersect if:
    if (b > 0 && b < 1) {
        result.onLine2 = true;
    }
    // if line1 and line2 are segments, they intersect if both of the above are true
    return result;
}

const checkForImageContent = canvas => {
  let context = canvas.getContext('2d')
  
  let cropFactor = 0.2

  let imageData = context.getImageData(Math.floor(canvas.width*cropFactor), Math.floor(canvas.height*cropFactor), canvas.width-(Math.floor(canvas.width*cropFactor)*2), canvas.height-(Math.floor(canvas.height*cropFactor)*2))

  let dim = [canvas.width-(Math.floor(canvas.width*cropFactor)*2), canvas.height-(Math.floor(canvas.height*cropFactor)*2)]
  // get pixels
  let img_u8 = new jsfeat.matrix_t(dim[0], dim[1], jsfeat.U8C1_t)
  jsfeat.imgproc.grayscale(imageData.data, dim[0], dim[1], img_u8)

  // blur
  let r = Math.floor(dim[0]/150)
  let kernel_size = (r+1) << 1
  jsfeat.imgproc.gaussian_blur(img_u8, img_u8, kernel_size, 0)

  // canny
  jsfeat.imgproc.canny(img_u8, img_u8, 10, 50)

  let i = img_u8.cols * img_u8.rows, pix = 0
  let count = 0
  while (--i >= 0) {
    count+= img_u8.data[i]
  }

  // 0 = empty, 255 drawn
  const threshold = dim[0] * dim[1] * .0005
  if (count >= threshold) {
    return true
  } else {
    return false
  }
}


const outputImage = (img_u8, context, filename) => {
  let imageData = context.getImageData(0, 0, context.canvas.width, context.canvas.height)
  let data_u32 = new Uint32Array(imageData.data.buffer)
  let alpha = (0xff << 24)
  let i = img_u8.cols*img_u8.rows, pix = 0
  while(--i >= 0) {
    pix = img_u8.data[i]
    data_u32[i] = alpha | (pix << 16) | (pix << 8) | pix
  }
  context.putImageData(imageData, 0, 0)
  let imgData = context.canvas.toDataURL().replace(/^data:image\/\w+;base64,/, '')
  //let imageFilePath = path.join(boardPath, 'images', filename)
  fs.writeFileSync(filename, imgData, 'base64')
}


const generateCropMarks = (paperSize, aspectRatio, rows, cols, spacing) => {
  let headerHeight = 80
  let documentSize
  if (paperSize == 'LTR') {
    documentSize = [8.5*72,11*72]
  } else {
    documentSize = [595,842]
  }
  console.log(aspectRatio)
  aspectRatio = Number(aspectRatio).toFixed(3)
  let margin = [22, 22, 22, 40]

  let boxesDim = [cols,rows]
  let boxSize = [(documentSize[1]-margin[0]-margin[2]-(spacing * (boxesDim[0]-1)))/boxesDim[0], (documentSize[0]-margin[1]-margin[3]-headerHeight-(spacing * (boxesDim[1])))/boxesDim[1] ]

  let cropMarks = []

  for (var iy = 0; iy < boxesDim[1]; iy++) {
    for (var ix = 0; ix < boxesDim[0]; ix++) {
      let x = margin[0]+(ix*boxSize[0])+(ix*spacing)
      let y = margin[1]+(iy*boxSize[1])+((iy+1)*spacing)+headerHeight
      let offset
      let box

      if((boxSize[0]/boxSize[1])>aspectRatio) {
        offset = [(boxSize[0]-(boxSize[1]*aspectRatio))/2,0]
        box = [x+offset[0],y, boxSize[1]*aspectRatio, boxSize[1]]
      } else {
        offset = [0, (boxSize[1]-(boxSize[0]/aspectRatio))/2]
        box = [x,y+offset[1], boxSize[0], boxSize[0]/aspectRatio]
      }
      cropMarks.push([box[0]/documentSize[1],box[1]/documentSize[0],box[2]/documentSize[1],box[3]/documentSize[0]])
    }
  }
  return cropMarks
}

ipcRenderer.on('worksheetImage', (event, args) => {
  actions.step('init')
  remote.getCurrentWindow().show()
  // wait for DOM to render
  setTimeout(() => {
    processWorksheetImage(args)
  }, 100)
})

window.ondragover = () => { return false }
window.ondragleave = () => { return false }
window.ondragend = () => { return false }
window.ondrop = () => { return false }

module.exports = {
  actions
}
