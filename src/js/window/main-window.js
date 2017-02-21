const {ipcRenderer, shell, remote, nativeImage, clipboard} = require('electron')
const child_process = require('child_process')
//const electronLocalshortcut = require('electron-localshortcut');
const fs = require('fs')
const path = require('path')
const moment = require('moment')
const menu = require('../menu.js')
const util = require('../wonderunit-utils.js')
const sfx = require('../wonderunit-sound.js')
const Color = require('color-js')

const sketchPane = require('../sketchpane.js')
const undoStack = require('../undo-stack.js')

let boardFilename
let boardPath
let boardData
let currentBoard = 0

let scriptData
let locations
let characters
let boardSettings
let currentPath
let currentScene = 0

let boardFileDirty = false
let boardFileDirtyTimer
let imageFileDirty = false
let imageFileDirtyTimer
let isEditMode = false
let editModeTimer

let textInputMode = false
let textInputAllowAdvance = false

let toggleMode = 0

let selections = new Set()

let thumbnailCursor = {
  visible: false,
  x: 0
}

menu.setMenu()

///////////////////////////////////////////////////////////////
// Loading / Init Operations
///////////////////////////////////////////////////////////////

ipcRenderer.on('load', (event, args)=>{
  if (args[1]) {
    // there is scriptData - the window opening is a script type
    scriptData = args[1]
    locations = args[2]
    characters = args[3]
    boardSettings = args[4]
    currentPath = args[5]

    //renderScenes()
    currentScene = boardSettings.lastScene
    loadScene(currentScene)

    assignColors()
    document.querySelector('#scenes').style.display = 'block'
    document.querySelector('#script').style.display = 'block'
    renderScenes()
    renderScript()

  } else {
    // if not, its just a simple single boarder file
    boardFilename = args[0]
    boardPath = boardFilename.split(path.sep)
    boardPath.pop()
    boardPath = boardPath.join(path.sep)
    console.log(' BOARD PATH: ', boardPath)

    boardData = JSON.parse(fs.readFileSync(boardFilename))
  }

  loadBoardUI()
  updateBoardUI()
})


let addToLineMileage = (value)=> {
  let board = boardData.boards[currentBoard]
  if (board.lineMileage) {
    board.lineMileage += value
  } else {
    board.lineMileage = value
  }
  markBoardFileDirty()
  renderMetaData()
}

let loadBoardUI = ()=> {
  let aspectRatio = boardData.aspectRatio
  console.log(aspectRatio)
  //let aspectRatio = 1.77777
  var size = []
  if (aspectRatio >= 1) {
    size = [(900*aspectRatio), 900]
  } else {
    size = [900, (900/aspectRatio)]
  }
  sketchPane.init(document.getElementById('sketch-pane'), ['reference', 'main', 'notes'], size)
  sketchPane.setBrush(1.5,[30,30,30],5,70,'main')
  sketchPane.on('lineMileage', (value)=>{
    addToLineMileage(value)
  })
  sketchPane.on('addToUndoStack', (id,imageBitmap)=>{
    //console.log(imageBitmap)
    undoStack.addImageData(null, null, id, imageBitmap)
  })

  for (var item of document.querySelectorAll('#board-metadata input, textarea')) {
    item.addEventListener('focus', (e)=> {
      textInputMode = true
      textInputAllowAdvance = false
      switch (e.target.name) {
        case 'duration':
        case 'frames':
          textInputAllowAdvance = true;
          break
      }
    })

    item.addEventListener('blur', (e)=> {
      textInputMode = false
      textInputAllowAdvance = false
    })

    item.addEventListener('change', (e)=> {
      switch (e.target.name) {
        case 'newShot':
          boardData.boards[currentBoard].newShot = e.target.checked
          markBoardFileDirty()
          textInputMode = false
          break
      }
      updateThumbnailDrawer()
    })

    item.addEventListener('input', (e)=> {
      switch (e.target.name) {
        case 'duration':
          boardData.boards[currentBoard].duration = Number(e.target.value)
          document.querySelector('input[name="frames"]').value = Math.round(Number(e.target.value)/1000*24)
          break
        case 'frames':
          boardData.boards[currentBoard].duration = Math.round(Number(e.target.value)/24*1000)
          document.querySelector('input[name="duration"]').value =  Math.round(Number(e.target.value)/24*1000)
          break
        case 'dialogue':
          boardData.boards[currentBoard].dialogue = (e.target.value)
          break
        case 'action':
          boardData.boards[currentBoard].action = (e.target.value)
          break
        case 'notes':
          boardData.boards[currentBoard].notes = (e.target.value)
          break
      }
      markBoardFileDirty()
    })
  }

  document.querySelector('#thumbnail-container').addEventListener('pointerdown', (e)=>{
    if (e.pointerType == 'pen' || e.pointerType == 'mouse') {
      dragTarget = document.querySelector('#thumbnail-container')
      dragTarget.style.overflow = 'hidden'
      dragTarget.style.scrollBehavior = 'unset'
      dragMode = true
      dragPoint = [e.pageX, e.pageY]
      scrollPoint = [dragTarget.scrollLeft, dragTarget.scrollTop]
      console.log(e)
    }
  })

  document.querySelector('#show-in-finder-button').addEventListener('pointerdown', (e)=>{
    let board = boardData.boards[currentBoard]
    let imageFilename = path.join(boardPath, 'images', board.url)
    shell.showItemInFolder(imageFilename)
  })

  document.querySelector('#open-in-photoshop-button').addEventListener('pointerdown', (e)=>{
    let board = boardData.boards[currentBoard]
    let imageFilename = path.join(boardPath, 'images', board.url)
    shell.openItem(imageFilename)
  })




  window.addEventListener('pointermove', (e)=>{
    if (isEditMode && dragMode) {
      // TODO timer instead of pointermove event, so scrolling is continuous

      let containerW = dragTarget.getBoundingClientRect().width

      let mouseX = e.clientX
      let midpointX = containerW / 2

      // distance ratio -1...0...1
      let distance = (mouseX - midpointX) / midpointX
      
      // default is the dead zone at 0
      let strength = 0
      // -1..-0.5
      if (distance < -0.5)
      {
        strength = -util.norm(distance, -0.5, -1)
      } 
      // 0.5..1
      else if (distance > 0.5)
      {
        strength = util.norm(distance, 0.5, 1)
      }

      strength = util.clamp(strength, -1, 1)

      // max speed is half of the average board width per pointermove
      let speedlimit = Math.floor(60 * boardData.aspectRatio * 0.5)

      // NOTE I don't bother clamping min/max because scrollLeft handles that for us
      let newScrollLeft = dragTarget.scrollLeft + (strength * speedlimit)

      dragTarget.scrollLeft = newScrollLeft

      updateThumbnailCursor(e)
      renderThumbnailCursor()
      return
    }

    if (dragMode) {
      dragTarget.scrollLeft = scrollPoint[0] + (dragPoint[0] - e.pageX)
      console.log(scrollPoint[0], dragPoint[0], e.pageX)
      dragTarget.scrollTop = scrollPoint[1] + (dragPoint[1] - e.pageY)
    }
  })

  window.addEventListener('pointerup', (e)=>{
    if (dragMode) {
      dragMode = false
      dragTarget.style.overflow = 'scroll'
      dragTarget.style.scrollBehavior = 'smooth'
    }

    clearTimeout(editModeTimer)
    if (isEditMode) {
      let x = e.clientX, y = e.clientY

      let el = thumbnailFromPoint(x, y)

      let point
      if (isBeforeFirstThumbnail(x, y)) {
        point = -1
      } else if (el) {
        point = el.dataset.thumbnail
      }

      // NOTE for far left, offscreen, point will be -1
      //      for far right, offscreen, point will be null

      if (point) {
        console.log('user requests move operation:', selections, 'to insert before', point)
      }

      disableEditMode()
    }
  })

  setTimeout(()=>{remote.getCurrentWindow().show()}, 200)
  //remote.getCurrentWebContents().openDevTools()
}

let updateBoardUI = ()=> {
  document.querySelector('#canvas-caption').style.display = 'none'

  if (boardData.boards.length == 0) {
    // create a new board
    newBoard(0)
  }
  // update sketchpane
  updateSketchPaneBoard()
  // update thumbail drawer
  updateThumbnailDrawer()
  // update timeline
  // update metadata
  gotoBoard(currentBoard)

}

///////////////////////////////////////////////////////////////
// Board Operations
///////////////////////////////////////////////////////////////

let newBoard = (position)=> {
  saveImageFile()

  if (typeof position == "undefined") position = currentBoard + 1

  // create array entry
  let uid = util.uidGen(5)

  let board = {
      "uid": uid,
      "url": 'board-' + (position+1) + '-' + uid + '.png' ,
      "newShot": false,
      "lastEdited": Date.now(),
    }
  // insert
  boardData.boards.splice(position, 0, board)
  // indicate dirty for save sweep
  markBoardFileDirty()
  updateThumbnailDrawer()
}

let markBoardFileDirty = ()=> {
  boardFileDirty = true
  clearTimeout(boardFileDirtyTimer)
  boardFileDirtyTimer = setTimeout(()=>{
    saveBoardFile()
  }, 5000)
}

let saveBoardFile = ()=> {
  if (boardFileDirty) {
    clearTimeout(boardFileDirtyTimer)
    fs.writeFileSync(boardFilename, JSON.stringify(boardData))
    console.log('saved board file!', boardFilename)
    boardFileDirty = false
  }
}

let markImageFileDirty = ()=> {
  imageFileDirty = true
  clearTimeout(imageFileDirtyTimer)
  imageFileDirtyTimer = setTimeout(()=>{
    saveImageFile()
  }, 5000)
}

let saveImageFile = ()=> {
  if (imageFileDirty) {
    clearTimeout(imageFileDirtyTimer)
    let imageData = document.querySelector('#main-canvas').toDataURL('image/png')
    imageData = imageData.replace(/^data:image\/\w+;base64,/, '');
    let board = boardData.boards[currentBoard]
    let imageFilename = path.join(boardPath, 'images', board.url)
    fs.writeFile(imageFilename, imageData, 'base64', function(err) {})
    console.log('saved IMAGE file!', imageFilename)
    imageFileDirty = false

    // setImmediate((currentBoard, boardPath, board)=>{
    //   document.querySelector("[data-thumbnail='" + currentBoard + "']").querySelector('img').src = boardPath + '/images/' + board.url + '?' + Date.now()
    // },currentBoard, boardPath, board)

    setTimeout((currentBoard, boardPath, board)=>{
      document.querySelector("[data-thumbnail='" + currentBoard + "']").querySelector('img').src = path.join(boardPath, 'images', board.url + '?' + Date.now())
    },100,currentBoard, boardPath, board)
  }
}

sketchPane.on('markDirty', markImageFileDirty)

let deleteBoard = (args)=> {
  if (boardData.boards.length > 1) {
    //should i ask to confirm deleting a board?
    boardData.boards.splice(currentBoard, 1)
    if (args) {
    } else {
      currentBoard--
    }
    markBoardFileDirty()
    updateThumbnailDrawer()
    gotoBoard(currentBoard)
  }
}

let duplicateBoard = ()=> {
  saveImageFile()
  // copy current board canvas
  let imageData = document.querySelector('#main-canvas').getContext("2d").getImageData(0,0, document.querySelector('#main-canvas').width, document.querySelector('#main-canvas').height)
  // get current board clone it
  let board = JSON.parse(JSON.stringify(boardData.boards[currentBoard]))
  // set uid
  let uid = util.uidGen(5)
  board.uid = uid
  board.url = 'board-' + (currentBoard+1) + '-' + uid + '.png'
  board.newShot = false
  board.lastEdited = Date.now()
  // insert
  boardData.boards.splice(currentBoard+1, 0, board)
  markBoardFileDirty()
  // go to board
  gotoBoard(currentBoard+1)
  // draw contents to board
  document.querySelector('#main-canvas').getContext("2d").putImageData(imageData, 0, 0)
  markImageFileDirty()
  saveImageFile()
  updateThumbnailDrawer()
  gotoBoard(currentBoard)
}

///////////////////////////////////////////////////////////////
// UI Rendering
///////////////////////////////////////////////////////////////

let goNextBoard = (direction)=> {
  saveImageFile()
  if (direction) {
    currentBoard += direction
  } else {
    currentBoard++
  }
  gotoBoard(currentBoard)
}

let gotoBoard = (boardNumber)=> {
  currentBoard = boardNumber
  currentBoard = Math.max(currentBoard, 0)
  currentBoard = Math.min(currentBoard, boardData.boards.length-1)
  updateSketchPaneBoard()
  for (var item of document.querySelectorAll('.thumbnail')) {
    item.classList.remove('active')
  }

  if (document.querySelector("[data-thumbnail='" + currentBoard + "']")) {
    document.querySelector("[data-thumbnail='" + currentBoard + "']").classList.add('active')

    let thumbDiv = document.querySelector("[data-thumbnail='" + currentBoard + "']")
    let containerDiv = document.querySelector('#thumbnail-container')

    if ((thumbDiv.offsetLeft+thumbDiv.offsetWidth+200) > (containerDiv.scrollLeft + containerDiv.offsetWidth)) {
      console.log("offscreen!!")
      containerDiv.scrollLeft = thumbDiv.offsetLeft - 300
    }

    if ((thumbDiv.offsetLeft-200) < (containerDiv.scrollLeft)) {
      console.log("offscreen!!")
      containerDiv.scrollLeft = thumbDiv.offsetLeft - containerDiv.offsetWidth + 300
    }


    // console.log()
    // console.log(.scrollLeft)
    // console.log(document.querySelector('#thumbnail-container').offsetWidth)


    //document.querySelector('#thumbnail-container').scrollLeft = (document.querySelector("[data-thumbnail='" + currentBoard + "']").offsetLeft)-200
  } else {
    setImmediate((currentBoard)=>{
      document.querySelector("[data-thumbnail='" + currentBoard + "']").classList.add('active')
    },currentBoard)

  }

  renderMetaData()

  let percentage
  if (boardData.boards[boardData.boards.length-1].duration) {
    percentage = (boardData.boards[currentBoard].time)/(boardData.boards[boardData.boards.length-1].time+boardData.boards[boardData.boards.length-1].duration)
  } else {
    percentage = (boardData.boards[currentBoard].time)/(boardData.boards[boardData.boards.length-1].time+2000)
  }

  console.log(percentage)
  let width = document.querySelector('#timeline #movie-timeline-content').offsetWidth
  console.log(width)
  document.querySelector('#timeline .marker').style.left = (width*percentage) + 'px'

  document.querySelector('#timeline .left-block').innerHTML = util.msToTime(boardData.boards[currentBoard].time)

  let totalTime
  if (boardData.boards[boardData.boards.length-1].duration) {
    totalTime = (boardData.boards[boardData.boards.length-1].time+boardData.boards[boardData.boards.length-1].duration)
  } else {
    totalTime = (boardData.boards[boardData.boards.length-1].time+2000)
  }
  document.querySelector('#timeline .right-block').innerHTML = util.msToTime(totalTime)



}

let renderMetaData = ()=> {
  document.querySelector('#board-metadata #shot').innerHTML = 'Shot: ' + boardData.boards[currentBoard].shot
  document.querySelector('#board-metadata #board-numbers').innerHTML = 'Board: ' + boardData.boards[currentBoard].number + ' of ' + boardData.boards.length
  for (var item of document.querySelectorAll('#board-metadata input, textarea')) {
    item.value = ''
    item.checked = false
  }
  if (boardData.boards[currentBoard].newShot) {
    document.querySelector('input[name="newShot"]').checked = true
    if (!boardData.boards[currentBoard].dialogue) {
      document.querySelector('#canvas-caption').style.display = 'none'
    }
  }
  if (boardData.boards[currentBoard].duration) {
    document.querySelector('input[name="duration"]').value = boardData.boards[currentBoard].duration
    document.querySelector('input[name="frames"]').value = Math.round(boardData.boards[currentBoard].duration/1000*24)
  }
  if (boardData.boards[currentBoard].dialogue) {
    document.querySelector('textarea[name="dialogue"]').value = boardData.boards[currentBoard].dialogue
    document.querySelector('#canvas-caption').innerHTML = boardData.boards[currentBoard].dialogue
    document.querySelector('#canvas-caption').style.display = 'block'
    document.querySelector('#suggested-dialogue-duration').innerHTML = util.durationOfWords(boardData.boards[currentBoard].dialogue, 300)+300 + "ms"
  } else {
    document.querySelector('#suggested-dialogue-duration').innerHTML = ''
  }
  if (boardData.boards[currentBoard].action) {
    document.querySelector('textarea[name="action"]').value = boardData.boards[currentBoard].action
  }
  if (boardData.boards[currentBoard].notes) {
    document.querySelector('textarea[name="notes"]').value = boardData.boards[currentBoard].notes
  }
  if (boardData.boards[currentBoard].lineMileage){
    document.querySelector('#line-miles').innerHTML = (boardData.boards[currentBoard].lineMileage/5280).toFixed(1) + ' line miles'
  } else {
    document.querySelector('#line-miles').innerHTML = '0 line miles'
  }




}




let nextScene = ()=> {
  if (currentBoard < (boardData.boards.length -1) && currentBoard !== 0) {
    currentBoard = (boardData.boards.length -1)
    gotoBoard(currentBoard)
  } else {
    saveBoardFile()
    currentScene++
    loadScene(currentScene)
    renderScript()
    updateBoardUI()
  }
}

let previousScene = ()=> {
  if (currentBoard > 0) {
    currentBoard = 0
    gotoBoard(currentBoard)
  } else {
    saveBoardFile()
    currentScene--
    currentScene = Math.max(0, currentScene)
    loadScene(currentScene)
    renderScript()
    updateBoardUI()
  }

  //gotoBoard(currentBoard)
}

let updateSketchPaneBoard = () => {
  // get current board
  let board = boardData.boards[currentBoard]
  // try to load url
  let imageFilename = path.join(boardPath, 'images', board.url)
  let context = document.querySelector('#main-canvas').getContext('2d')
  context.globalAlpha = 1

  console.log('loading image')
  if (!fs.existsSync(imageFilename)){
    context.clearRect(0, 0, context.canvas.width, context.canvas.height)
  } else {
    let image = new Image()
    image.onload = ()=> {
      context.clearRect(0, 0, context.canvas.width, context.canvas.height)
      context.drawImage(image, 0, 0)
    }
    image.src = imageFilename + '?' + Math.random()
  }
}

let updateThumbnailDrawer = ()=> {

  let hasShots = false
  for (var board of boardData.boards) {
    if (board.newShot) {
      hasShots = true
      break
    }
  }

  console.log("HAS SHOTS!!!!")
  let currentShot = 0
  let subShot = 0
  let boardNumber = 1
  let currentTime = 0

  for (var board of boardData.boards) {
    if (hasShots) {
      if (board.newShot || (currentShot==0)) {
        currentShot++
        subShot = 0
      } else {
        subShot++
      }

      substr = String.fromCharCode(97 + (subShot%26)).toUpperCase()
      if ((Math.ceil(subShot/25)-1) > 0) {
        substr+= (Math.ceil(subShot/25))
      }

      board.shot = currentShot + substr
      board.number = boardNumber

    } else {
      board.number = boardNumber
      board.shot = (boardNumber) + "A"
    }
    boardNumber++

    board.time = currentTime

    if (board.duration) {
      currentTime += board.duration
    } else {
      currentTime += 2000
    }
  }



  let html = []
  let i = 0
  for (var board of boardData.boards) {
    html.push('<div data-thumbnail="' + i + '" class="thumbnail')
    if (hasShots) {
      if (board.newShot || (i==0)) {
        html.push(' startShot')
      }

      if (i < boardData.boards.length-1) {
        if (boardData.boards[i+1].newShot) {
          html.push(' endShot')
        }
      } else {
        html.push(' endShot')
      }

    } else {
      html.push(' startShot')
      html.push(' endShot')
    }
    if (currentBoard == i) {
      html.push(' active')
    }
    if (selections.has(i)) {
      html.push(' selected')
      if (isEditMode) {
        html.push(' editing')
      }
    }
    let thumbnailWidth = Math.floor(60 * boardData.aspectRatio)
    html.push('" style="width: ' + thumbnailWidth + 'px;">')
    let imageFilename = path.join(boardPath, 'images', board.url)
    if (!fs.existsSync(imageFilename)){
      // bank image
      html.push('<img src="//:0" height="60" width="' + thumbnailWidth + '">')
    } else {
      html.push('<div class="top">')
      html.push('<img src="' + imageFilename + '" height="60" width="' + thumbnailWidth + '">')
      html.push('</div>')
    }
    html.push('<div class="info">')
    html.push('<div class="number">' + board.shot + '</div>')
    html.push('<div class="caption">')
    if (board.dialogue) {
      html.push(board.dialogue)
    }
    html.push('</div><div class="duration">')
    if (board.duration) {
      html.push(util.msToTime(board.duration))
    } else {
      html.push(util.msToTime(2000))
    }
    html.push('</div>')
    html.push('</div>')
    html.push('</div>')
    i++
  }
  document.querySelector('#thumbnail-drawer').innerHTML = html.join('')


  let thumbnails = document.querySelectorAll('.thumbnail')
  for (var thumb of thumbnails) {
    thumb.addEventListener('pointerdown', (e)=>{
      console.log("DOWN")

      // always track cursor position
      updateThumbnailCursor(e)
      editModeTimer = setTimeout(enableEditMode, 1000)

      let index = Number(e.target.dataset.thumbnail)
      if (selections.has(index)) {
        // ignore
      } else if (e.shiftKey) {
        // add to selections
        let min = Math.min(...selections, index)
        let max = Math.max(...selections, index)
        selections = new Set(util.range(min, max))

        updateThumbnailDrawer()
      } else if (currentBoard !== index) {
        // go to board by index
        
        // reset selections
        selections.clear()

        saveImageFile()
        currentBoard = index
        updateThumbnailDrawer()
        gotoBoard(currentBoard)
      }
    }, true, true)
  }

  renderTimeline()

  //gotoBoard(currentBoard)
}

let renderTimeline = () => {
  let html = []
  html.push('<div class="marker-holder"><div class="marker"></div></div>')
  var i = 0
  for (var board of boardData.boards ) {
    if (board.duration) {
      html.push(`<div style="flex:${board.duration};" data-node="${i}" class="t-scene"></div>`)
    } else {
      html.push(`<div style="flex: 2000;" data-node="${i}" class="t-scene"></div>`)
    }
    i++
  }
  document.querySelector('#timeline #movie-timeline-content').innerHTML = html.join('')

  let boardNodes = document.querySelectorAll('#timeline #movie-timeline-content .t-scene')
  for (var board of boardNodes) {
    board.addEventListener('pointerdown', (e)=>{
      currentBoard = Number(e.target.dataset.node)
      gotoBoard(currentBoard)
    }, true, true)
  }
}

let dragMode = false
let dragPoint
let dragTarget
let scrollPoint

let renderScenes = ()=> {
  let html = []
  let angle = 0
  let i = 0
  html.push('<div id="outline-gradient"></div>')
  for (var node of scriptData ) {
    switch (node.type) {
      case 'section':
        html.push('<div class="section node">' + node.text + '</div>')
        break
      case 'scene':
        if (node.scene_number !== 0) {
          if (currentScene == (Number(node.scene_number)-1)) {
            html.push('<div class="scene node active" data-node="' + (Number(node.scene_number)-1) + '" style="background:' + getSceneColor(node.slugline) + '">')
          } else {
            html.push('<div class="scene node" data-node="' + (Number(node.scene_number)-1) + '" style="background:' + getSceneColor(node.slugline) + '">')
          }
          html.push('<div class="number">SCENE ' + node.scene_number + ' - ' + util.msToTime(node.duration) + '</div>')
          if (node.slugline) {
            html.push('<div class="slugline">' + node.slugline + '</div>')
          }
          if (node.synopsis) {
            html.push('<div class="synopsis">' + node.synopsis + '</div>')
          }
          // time, duration, page, word_count
          html.push('</div>')
        }
        break
    }
    i++
  }

  document.querySelector('#scenes').innerHTML = html.join('')

  let sceneNodes = document.querySelectorAll('#scenes .scene')
  for (var node of sceneNodes) {
    node.addEventListener('pointerdown', (e)=>{
      //console.log(e.target.dataset.node)
      if (currentScene !== Number(e.target.dataset.node)) {
        currentScene = Number(e.target.dataset.node)
        loadScene(currentScene)
        renderScript()
        updateBoardUI()
      }
    }, true, true)
  }

  document.querySelector('#scenes').addEventListener('pointerdown', (e)=>{
    if (e.pointerType == 'pen' || e.pointerType == 'mouse') {
      dragTarget = document.querySelector('#scenes')
      dragTarget.style.overflow = 'hidden'
      dragTarget.style.scrollBehavior = 'unset'
      dragMode = true
      dragPoint = [e.pageX, e.pageY]
      scrollPoint = [dragTarget.scrollLeft, dragTarget.scrollTop]
      console.log(e)
    }
  })

  document.querySelector('#script').addEventListener('pointerdown', (e)=>{
    if (e.pointerType == 'pen' || e.pointerType == 'mouse') {
      dragTarget = document.querySelector('#script')
      dragTarget.style.overflow = 'hidden'
      dragTarget.style.scrollBehavior = 'unset'
      dragMode = true
      dragPoint = [e.pageX, e.pageY]
      scrollPoint = [dragTarget.scrollLeft, dragTarget.scrollTop]
      console.log(e)
    }
  })
}

let renderScript = ()=> {
  console.log(currentScene)
  let sceneCount = 0
  let html = []
  for (var node of scriptData ) {
    if (node.type == 'scene') {
      if (node.scene_number == (currentScene+1)) {
        html.push('<div class="item slugline"><div class="number">SCENE ' + node.scene_number + ' - ' +  util.msToTime(node.duration) + '</div>')

        html.push('<div>' + node.slugline + '</div>')
        if (node.synopsis) {
          html.push('<div class="synopsis">' + node.synopsis + '</div>')
        }

        html.push('</div>')
        for (var item of node.script) {
          switch (item.type) {
            case 'action':
              html.push('<div class="item">' + item.text + '</div>')
              break
            case 'dialogue':
              html.push('<div class="item">' + item.character + '<div class="dialogue">' + item.text + '</div></div>')
              break
            case 'transition':
              html.push('<div class="item transition">' + item.text + '</div>')
              break
          }
        }
        break
      }
      sceneCount++
    }
  }
  document.querySelector('#script').innerHTML = html.join('')
}

let assignColors = function () {
  let angle = (360/30)*3
  for (var node of locations) {
    angle += (360/30)+47
    c = Color("#00FF00").shiftHue(angle).desaturateByRatio(.1).darkenByRatio(0.65).blend(Color('white'), 0.4).saturateByRatio(.9)
    node.push(c.toCSS())
  }
}

let getSceneColor = function (sceneString) {
  if (sceneString && (sceneString !== 'BLACK')) {
    let location = sceneString.split(' - ')
    if (location.length > 1) {
      location.pop()
    }
    location = location.join(' - ')
    return (locations.find(function (node) { return node[0] == location })[2])
  }
  return ('black')
}

///////////////////////////////////////////////////////////////


let loadScene = (sceneNumber) => {
  saveImageFile()
  saveBoardFile()

  currentBoard = 0

  // does the boardfile/directory exist?
  let boardsDirectoryFolders = fs.readdirSync(currentPath).filter(function(file) {
    return fs.statSync(path.join(currentPath, file)).isDirectory()
  })

  let sceneCount = 0

  for (var node of scriptData) {
    if (node.type == 'scene') {
      if (sceneNumber == (Number(node.scene_number)-1)) {
        // load script
        sceneCount++
        let directoryFound = false
        let foundDirectoryName

        console.log(node)

        let id

        if (node.scene_id) {
          id = node.scene_id.split('-')
          if (id.length>1) {
            id = id[1]
          } else {
            id = id[0]
          }
        } else {
          id = 'G' + sceneCount
        }

        for (var directory of boardsDirectoryFolders) {
          let directoryId = directory.split('-')
          directoryId = directoryId[directoryId.length - 1]
          if (directoryId == id) {
            directoryFound = true
            foundDirectoryName = directory
            console.log("FOUND THE DIRECTORY!!!!")
            break
          }
        }

        if (!directoryFound) {
          console.log(node)
          console.log("MAKE DIRECTORY")

          let directoryName = 'Scene-' + node.scene_number + '-'
          if (node.synopsis) {
            directoryName += node.synopsis.substring(0, 50).replace(/\|&;\$%@"<>\(\)\+,/g, '').replace(/\./g, '').replace(/ - /g, ' ').replace(/ /g, '-')
          } else {
            directoryName += node.slugline.substring(0, 50).replace(/\|&;\$%@"<>\(\)\+,/g, '').replace(/\./g, '').replace(/ - /g, ' ').replace(/ /g, '-')
          }
          directoryName += '-' + node.scene_id

          console.log(directoryName)
          // make directory
          fs.mkdirSync(path.join(currentPath, directoryName))
          // make storyboarder file

          let newBoardObject = {
            aspectRatio: boardSettings.aspectRatio,
            fps: 24,
            defaultBoardTiming: 2000,
            boards: []
          }
          boardFilename = path.join(currentPath, directoryName, directoryName + '.storyboarder')
          boardData = newBoardObject
          fs.writeFileSync(boardFilename, JSON.stringify(newBoardObject))
          // make storyboards directory
          fs.mkdirSync(path.join(currentPath, directoryName, 'images'))

        } else {
          // load storyboarder file
          console.log('load storyboarder!')
          console.log(foundDirectoryName)

          if (!fs.existsSync(path.join(currentPath, foundDirectoryName, 'images'))) {
            fs.mkdirSync(path.join(currentPath, foundDirectoryName, 'images'))
          }


          boardFilename = path.join(currentPath, foundDirectoryName, foundDirectoryName + '.storyboarder')
          boardData = JSON.parse(fs.readFileSync(boardFilename))
        }

        //check if boards scene exists in

        for (var item of document.querySelectorAll('#scenes .scene')) {
          item.classList.remove('active')
        }

      console.log((Number(node.scene_number)-1))


        if (document.querySelector("[data-node='" + (Number(node.scene_number)-1) + "']")) {
          document.querySelector("[data-node='" + (Number(node.scene_number)-1) + "']").classList.add('active')
        }




        break
      }
    }
  }

  boardPath = boardFilename.split(path.sep)
  boardPath.pop()
  boardPath = boardPath.join(path.sep)
  console.log('BOARD PATH:', boardPath)

  dragTarget = document.querySelector('#thumbnail-container')
  dragTarget.style.scrollBehavior = 'unset'


}


let scalePanImage = () => {
  let scaleFactor = canvasDiv.offsetWidth/canvasDiv.width
  console.log(scaleFactor)

  let scale = scaleFactor * 1.2
  canvasDiv.style.height
}


window.onmousedown = (e) => {
  stopPlaying()
}


window.onresize = (e) => {
}

window.onkeydown = (e)=> {
  if (!textInputMode || textInputAllowAdvance) {

    console.log(e)

    switch (e.code) {
      case 'KeyC':
        if (e.metaKey || e.ctrlKey) {
          copyBoard()
          e.preventDefault()
        }
        break
      case 'KeyV':
        if (e.metaKey || e.ctrlKey) {
          pasteBoard()
          e.preventDefault()
        }
        break
      case 'KeyZ':
       if (e.metaKey || e.ctrlKey) {
          if (e.shiftKey) {
            undoStack.redo()
            markImageFileDirty()
          } else {
            undoStack.undo()
            markImageFileDirty()
          }
          e.preventDefault()
        }
        break
      case 'Tab':
        toggleViewMode()
        e.preventDefault()
        break;
      case 'Space':
        togglePlayback()
        e.preventDefault()
        break
      case 'ArrowLeft':
        if (e.metaKey || e.ctrlKey) {
          previousScene()
        } else {
          goNextBoard(-1)
        }
        selections.clear()
        updateThumbnailDrawer()
        e.preventDefault()
        break
      case 'ArrowRight':
        if (e.metaKey || e.ctrlKey) {
          nextScene()
        } else {
          goNextBoard()
        }
        selections.clear()
        updateThumbnailDrawer()
        e.preventDefault()
        break
    }
  }
}

///////////////////////////////////////////////////////////////
// Playback
///////////////////////////////////////////////////////////////

let playbackMode = false
let frameTimer
let speakingMode = true
let utter = new SpeechSynthesisUtterance()

let stopPlaying = () => {
  clearTimeout(frameTimer)
  playbackMode = false
  utter.onend = null
  ipcRenderer.send('resumeSleep')
  speechSynthesis.cancel()
}

let togglePlayback = ()=> {
  playbackMode = !playbackMode
  if (playbackMode) {
    ipcRenderer.send('preventSleep')
    playAdvance(true)
  } else {
    stopPlaying()
  }
}

let playAdvance = function(first) {
  //clearTimeout(playheadTimer)
  clearTimeout(frameTimer)
  if (!first) {
    goNextBoard(1)
  }

  if (playbackMode && boardData.boards[currentBoard].dialogue) {
    speechSynthesis.cancel()
    utter.pitch = 0.65
    utter.rate = 1.1

    var string = boardData.boards[currentBoard].dialogue.split(':')
    string = string[string.length-1]

    utter.text = string
    speechSynthesis.speak(utter)
  }



  var frameDuration
  if (boardData.boards[currentBoard].duration) {
    frameDuration = boardData.boards[currentBoard].duration
  } else {
    frameDuration = 2000
  }
  frameTimer = setTimeout(playAdvance, frameDuration)
}


//// VIEW

let toggleViewMode = ()=> {
  if (scriptData) {
    toggleMode = ((toggleMode+1)%6)
    switch (toggleMode) {
      case 0:
        document.querySelector('#scenes').style.display = 'block'
        document.querySelector('#script').style.display = 'block'
        document.querySelector('#board-metadata').style.display = 'flex'
        document.querySelector('#toolbar').style.display = 'block'
        document.querySelector('#thumbnail-container').style.display = 'block'
        document.querySelector('#timeline').style.display = 'flex'
        document.querySelector('#playback').style.display = 'flex'
        break
      case 1:
        document.querySelector('#scenes').style.display = 'none'
        document.querySelector('#script').style.display = 'block'
        document.querySelector('#board-metadata').style.display = 'flex'
        document.querySelector('#toolbar').style.display = 'block'
        break
      case 2:
        document.querySelector('#scenes').style.display = 'none'
        document.querySelector('#script').style.display = 'none'
        document.querySelector('#board-metadata').style.display = 'flex'
        document.querySelector('#toolbar').style.display = 'block'
        break
      case 3:
        document.querySelector('#scenes').style.display = 'none'
        document.querySelector('#script').style.display = 'none'
        document.querySelector('#board-metadata').style.display = 'none'
        document.querySelector('#toolbar').style.display = 'block'
        break
      case 4:
        document.querySelector('#scenes').style.display = 'none'
        document.querySelector('#script').style.display = 'none'
        document.querySelector('#board-metadata').style.display = 'none'
        document.querySelector('#toolbar').style.display = 'none'
        document.querySelector('#thumbnail-container').style.display = 'block'
        document.querySelector('#timeline').style.display = 'flex'
        document.querySelector('#playback').style.display = 'flex'
        break
      case 5:
        document.querySelector('#scenes').style.display = 'none'
        document.querySelector('#script').style.display = 'none'
        document.querySelector('#board-metadata').style.display = 'none'
        document.querySelector('#toolbar').style.display = 'none'
        document.querySelector('#thumbnail-container').style.display = 'none'
        document.querySelector('#timeline').style.display = 'none'
        document.querySelector('#playback').style.display = 'none'
        break
    }
  } else {
    toggleMode = ((toggleMode+1)%4)
    switch (toggleMode) {
      case 0:
        document.querySelector('#scenes').style.display = 'none'
        document.querySelector('#script').style.display = 'none'
        document.querySelector('#board-metadata').style.display = 'flex'
        document.querySelector('#toolbar').style.display = 'block'
        document.querySelector('#thumbnail-container').style.display = 'block'
        document.querySelector('#timeline').style.display = 'flex'
        document.querySelector('#playback').style.display = 'flex'
        break
      case 1:
        document.querySelector('#scenes').style.display = 'none'
        document.querySelector('#script').style.display = 'none'
        document.querySelector('#board-metadata').style.display = 'none'
        document.querySelector('#toolbar').style.display = 'block'
        break
      case 2:
        document.querySelector('#scenes').style.display = 'none'
        document.querySelector('#script').style.display = 'none'
        document.querySelector('#board-metadata').style.display = 'none'
        document.querySelector('#toolbar').style.display = 'none'
        document.querySelector('#thumbnail-container').style.display = 'block'
        document.querySelector('#timeline').style.display = 'flex'
        document.querySelector('#playback').style.display = 'flex'
        break
      case 3:
        document.querySelector('#scenes').style.display = 'none'
        document.querySelector('#script').style.display = 'none'
        document.querySelector('#board-metadata').style.display = 'none'
        document.querySelector('#toolbar').style.display = 'none'
        document.querySelector('#thumbnail-container').style.display = 'none'
        document.querySelector('#timeline').style.display = 'none'
        document.querySelector('#playback').style.display = 'none'
        break
    }
  }
  sketchPane.sizeCanvas()
}

ipcRenderer.on('newBoard', (event, args)=>{
  if (!textInputMode) {
    if (args > 0) {
      // insert after
      newBoard()
      gotoBoard(currentBoard+1)
    } else {
      // inset before
      newBoard(currentBoard)
      gotoBoard(currentBoard)
    }
  }
})

ipcRenderer.on('togglePlayback', (event, args)=>{
  if (!textInputMode) {
    togglePlayback()
  }
})

ipcRenderer.on('goPreviousBoard', (event, args)=>{
  if (!textInputMode) {
    goNextBoard(-1)
  }
})

ipcRenderer.on('goNextBoard', (event, args)=>{
  if (!textInputMode) {
    goNextBoard()
  }
})

ipcRenderer.on('previousScene', (event, args)=>{
  previousScene()
})

ipcRenderer.on('nextScene', (event, args)=>{
  nextScene()
})

// tools

ipcRenderer.on('undo', (e, arg)=> {
  if (!textInputMode) {
    undoStack.undo()
    markImageFileDirty()
  }
})

ipcRenderer.on('redo', (e, arg)=> {
  if (!textInputMode) {
    undoStack.redo()
    markImageFileDirty()
  }
})

let copyBoard = ()=> {
  if (!textInputMode) {
    let board = JSON.parse(JSON.stringify(boardData.boards[currentBoard]))
    let canvasDiv = document.querySelector('#main-canvas')
    board.imageDataURL = canvasDiv.toDataURL()
    clipboard.clear()
    clipboard.write({
      image: nativeImage.createFromDataURL(canvasDiv.toDataURL()),
      text: JSON.stringify(board),
    })
  }
}

let pasteBoard = ()=> {
  if (!textInputMode) {

    console.log("paste")
    // check whats in the clipboard
    let clipboardContents = clipboard.readText()
    let clipboardImage = clipboard.readImage()

    let imageContents
    let board

    if (clipboardContents !== "") {
      try {
        board = JSON.parse(clipboardContents)
        imageContents = board.imageDataURL
        delete board.imageDataURL
        //console.log(json)
      }
      catch (e) {
        console.log(e)
      }
    }

    if (!board && (clipboardImage !== "")) {
      imageContents = clipboardImage.toDataURL()
    }



    if (imageContents) {
      saveImageFile()
      // copy current board canvas
      let uid = util.uidGen(5)

      if (board) {
        board.uid = uid
        board.url = 'board-' + (currentBoard+1) + '-' + uid + '.png'
        board.newShot = false
        board.lastEdited = Date.now()
      } else {
        board = {
          "uid": uid,
          "url": 'board-' + (currentBoard+1) + '-' + uid + '.png' ,
          "newShot": false,
          "lastEdited": Date.now(),
        }
      }

      boardData.boards.splice(currentBoard+1, 0, board)
      markBoardFileDirty()
      // go to board
      gotoBoard(currentBoard+1)
      // draw contents to board

      var image = new Image()
      image.src = imageContents

      document.querySelector('#main-canvas').getContext("2d").drawImage(image, 0, 0)
      markImageFileDirty()
      saveImageFile()
      updateThumbnailDrawer()
      gotoBoard(currentBoard)

    }

  }
}

let enableEditMode = () => {
  if (!isEditMode && selections.size) {
    isEditMode = true
    thumbnailCursor.visible = true
    renderThumbnailCursor()
    updateThumbnailDrawer()
  }
}

let disableEditMode = () => {
  if (isEditMode) {
    isEditMode = false
    thumbnailCursor.visible = false
    renderThumbnailCursor()
    updateThumbnailDrawer()
  }
}

let thumbnailFromPoint = (x, y) => {
  let el = document.elementFromPoint(x, y)

  if (!el || !el.classList.contains('thumbnail')) return null

  // if part of a multi-selection, base from right-most element
  if (selections.has(Number(el.dataset.thumbnail))) {
    // base from the right-most thumbnail in the selection
    let rightMost = Math.max(...selections)
    let rightMostEl = document.querySelector('#thumbnail-drawer div[data-thumbnail="' + rightMost + '"]')
    el = rightMostEl
  }

  return el
}

let isBeforeFirstThumbnail = (x, y) => {
  // HACK are we near the far left edge, before any thumbnails?
  if (x <= Math.floor(20 * boardData.aspectRatio)) {
    // have we scrolled all the way to the left already?
    let containerScrollLeft = document.getElementById('thumbnail-container').scrollLeft
    if (containerScrollLeft == 0) {
      return true
    }
  }
  return false
}

let updateThumbnailCursor = (event) => {
  let x = event.clientX, y = event.clientY

  if (isBeforeFirstThumbnail(x, y)) {
    thumbnailCursor.x = 0
    return
  }

  let el = thumbnailFromPoint(x, y)
  if (!el) return

  // HACK two levels deep of offset scrollLeft
  let scrollOffsetX = el.offsetParent.scrollLeft +
                      el.offsetParent.offsetParent.scrollLeft

  let elementOffsetX = el.getBoundingClientRect().right

  // is this an end shot?
  if (el.classList.contains('endShot')) {
    elementOffsetX += 5
  }

  let arrowOffsetX = -8
  
  thumbnailCursor.x = scrollOffsetX +
                      elementOffsetX +
                      arrowOffsetX
}

let renderThumbnailCursor = () => {
  let el = document.querySelector('#thumbnail-cursor')
  if (thumbnailCursor.visible) {
    el.style.display = ''
    el.style.left = thumbnailCursor.x + 'px'
  } else {
    el.style.display = 'none'
    el.style.left = '0px'
  }
}

ipcRenderer.on('setTool', (e, arg)=> {
  if (!textInputMode) {
    console.log('setTool', arg)
    switch(arg) {
      case 'lightPencil':
        sketchPane.setBrush(2,[200,220,255],5,50,'main')
        break
      case 'pencil':
        sketchPane.setBrush(1.5,[30,30,30],5,70,'main')
        break
      case 'pen':
        sketchPane.setBrush(3,[0,0,0],60,80,'main')
        break
      case 'brush':
        sketchPane.setBrush(20,[0,0,100],2,10,'main')
        break
      case 'eraser':
        sketchPane.setEraser()
        break
    }
  }
  // sketchPane.setBrush(4,[255,0,0],100,100,'notes')
})

ipcRenderer.on('clear', (e, arg)=> {
  if (!textInputMode) {
    sketchPane.clear()
  }
})

ipcRenderer.on('brushSize', (e, arg)=> {
  if (!textInputMode) {
    sketchPane.changeBrushSize(arg)
  }
})

ipcRenderer.on('flipBoard', (e, arg)=> {
  if (!textInputMode) {
    sketchPane.flipBoard()
  }
})

ipcRenderer.on('deleteBoard', (event, args)=>{
  if (!textInputMode) {
    deleteBoard(args)
  }
})

ipcRenderer.on('duplicateBoard', (event, args)=>{
  if (!textInputMode) {
    duplicateBoard()
  }
})

ipcRenderer.on('toggleViewMode', (event, args)=>{
  if (!textInputMode) {
    toggleViewMode()
  }
})