const {ipcRenderer, shell, remote, nativeImage, clipboard} = require('electron')
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

let textInputMode = false
let textInputAllowAdvance = false

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
  sketchPane.on('lineMileage', (value)=>{console.log(value)})
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

  window.addEventListener('pointermove', (e)=>{
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
  })

  setTimeout(()=>{remote.getCurrentWindow().show()}, 200)
  remote.getCurrentWebContents().openDevTools()
}

let updateBoardUI = ()=> {
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

let deleteBoard = ()=> {
  if (boardData.boards.length > 1) {
    //should i ask to confirm deleting a board?
    boardData.boards.splice(currentBoard, 1)
    currentBoard--
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
  console.log(boardData.boards[currentBoard])

  console.log(boardData.boards[currentBoard].shot)

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



}




let nextScene = ()=> {
  currentScene++
  loadScene(currentScene)
  renderScript()
  updateBoardUI()
  //gotoBoard(currentBoard)
}

let previousScene = ()=> {
  currentScene--
  currentScene = Math.max(0, currentScene)
  loadScene(currentScene)
  renderScript()
  updateBoardUI()
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
    html.push('" style="width: ' + ((60 * boardData.aspectRatio)) + 'px;">')
    let imageFilename = path.join(boardPath, 'images', board.url)
    if (!fs.existsSync(imageFilename)){
      // bank image
      html.push('<img src="//:0" height="60" width="' + (60 * boardData.aspectRatio) + '">')
    } else {
      html.push('<div class="top">')
      html.push('<img src="' + imageFilename + '" height="60" width="' + (60 * boardData.aspectRatio) + '">')
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
      if (currentBoard !== Number(e.target.dataset.thumbnail)) {
        saveImageFile()
        currentBoard = Number(e.target.dataset.thumbnail)
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
  for (var board of boardData.boards ) {
    if (board.duration) {
      html.push('<div style="flex: ' + board.duration + ';"></div>')
    } else {
      html.push('<div style="flex: 2000;"></div>')
    }
  }
  document.querySelector('#timeline #movie-timeline-content').innerHTML = html.join('')
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
      if (sceneCount == currentScene) {
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
  if (sceneString) {
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

  for (var node of scriptData) {
    if (node.type == 'scene') {
      if (sceneNumber == (Number(node.scene_number)-1)) {
        // load script
        let directoryFound = false
        let foundDirectoryName

        console.log(node)

        let id = node.scene_id.split('-')
        if (id.length>1) {
          id = id[1]
        } else {
          id = id[0]
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
    switch (e.code) {
      case 'Space':
        togglePlayback()
        e.preventDefault()
        break
      case 'ArrowLeft':
        goNextBoard(-1)
        e.preventDefault()
        break
      case 'ArrowRight':
        goNextBoard()
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

// let playSpeechAdvance = function(first) {
//   //clearTimeout(frameTimer)
//   clearTimeout(updateTimer)

//   if (playbackMode) {
//     if (!first) {
//       advanceFrame(1)
//     } else {
//       advanceFrame(0)
//     }

//     utter.pitch = 0.65;
//     utter.rate = 1.1;

//     switch (scriptData[currentNode].type) {
//       case 'title':
//         let string = []
//         string.push(scriptData[currentNode].text.toLowerCase().replace(/<\/?[^>]+(>|$)/g, "") + '. ')
//         if (scriptData[currentNode].credit) {
//           string.push(scriptData[currentNode].credit + ' ')
//         }
//         if (scriptData[currentNode].author) {
//           string.push(scriptData[currentNode].author + ' ')
//         }
//         if (scriptData[currentNode].authors) {
//           string.push(scriptData[currentNode].authors + ' ')
//         }

//         utter.text = string.join('')
//         delayTime = 2000
//         break
//       case 'section':
//         utter.text = scriptData[currentNode].text.toLowerCase()
//         delayTime = 2000
//         break
//       case 'scene':
//         if (currentSceneNode > -1) {
//           switch (scriptData[currentNode]['script'][currentSceneNode].type) {
//             case 'scene_padding':
//               utter.text = ''
//               playSpeechAdvance()
//               break
//             case 'scene_heading':
//               utter.text = scriptData[currentNode]['script'][currentSceneNode].text.toLowerCase().replace("mr.", "mister").replace("int. ", "interior, ").replace("ext. ", "exterior, ")
//               currentSpeaker = ''
//               delayTime = 1000
//               break
//             case 'action':
//               utter.text = scriptData[currentNode]['script'][currentSceneNode].text.replace(/<\/?[^>]+(>|$)/g, "")
//               currentSpeaker = ''
//               delayTime = 500
//               break
//             case 'parenthetical':
//             case 'dialogue':
//               let string = []

//               if (scriptData[currentNode].type == 'dialogue') {
//                 delayTime = 1000
//               } else {
//                 delayTime = 500
//               }
//               if (currentSpeaker !== scriptData[currentNode]['script'][currentSceneNode].character) {
//                 str = scriptData[currentNode]['script'][currentSceneNode].character.toLowerCase().replace("mr.", "mister").replace("(o.s.)", ", offscreen, ").replace("(v.o.)", ", voiceover, ").replace("(cont'd)", ", continued, ").replace("(cont’d)", ", continued, ") + ', '
//                 string.push(str)
//                 currentSpeaker = scriptData[currentNode]['script'][currentSceneNode].character
//               }
//               string.push(scriptData[currentNode]['script'][currentSceneNode].text.replace(/<\/?[^>]+(>|$)/g, ""))
//               utter.text = string.join('')
//               break
//             case 'transition':
//               utter.text = scriptData[currentNode]['script'][currentSceneNode].text.replace(/<\/?[^>]+(>|$)/g, "")
//               break
//             case 'section':
//               utter.text = ''
//               playSpeechAdvance()
//               break
//           }
//         }
//         break
//     }

//     utter.onend = function(event) {
//       //console.log(((new Date().getTime())-startSpeakingTime)/utter.text.length)
//       speechSynthesis.cancel()
//       if (playbackMode) {
//         setTimeout(playSpeechAdvance, delayTime)
//       }
//     }

//     speechSynthesis.speak(utter);
//     startSpeakingTime = new Date().getTime()
//   }
// }





  // globalShortcut.register('CommandOrControl+1', () => {
  //   sketchWindow.webContents.send('changeBrush', 'light')
  // })

  // globalShortcut.register('CommandOrControl+2', () => {
  //   sketchWindow.webContents.send('changeBrush', 'pencil')
  // })

  // globalShortcut.register('CommandOrControl+3', () => {
  //   sketchWindow.webContents.send('changeBrush', 'pen')
  // })

  // globalShortcut.register('CommandOrControl+4', () => {
  //   sketchWindow.webContents.send('changeBrush', 'brush')
  // })

  // globalShortcut.register('CommandOrControl+Backspace', () => {
  //   sketchWindow.webContents.send('clear')
  // })

  // globalShortcut.register('CommandOrControl+Z', () => {
  //   sketchWindow.webContents.send('undo')
  // })

  // globalShortcut.register('CommandOrControl+Y', () => {
  //   sketchWindow.webContents.send('redo')
  // })

  // globalShortcut.register('[', () => {
  //   sketchWindow.webContents.send('smallerBrush')
  // })

  // globalShortcut.register(']', () => {
  //   sketchWindow.webContents.send('largerBrush')
  // })

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
  console.log("sup")
  previousScene()
})

ipcRenderer.on('nextScene', (event, args)=>{
  nextScene()
})

// tools

ipcRenderer.on('undo', (e, arg)=> {
  if (!textInputMode) {
    undoStack.undo()
  }
})

ipcRenderer.on('redo', (e, arg)=> {
  if (!textInputMode) {
    undoStack.redo()
  }
})

ipcRenderer.on('copy', (e, arg)=> {
  if (!textInputMode) {
    console.log("copy")
    let board = JSON.parse(JSON.stringify(boardData.boards[currentBoard]))
    let canvasDiv = document.querySelector('#main-canvas')

    board.imageDataURL = canvasDiv.toDataURL()

    console.log(JSON.stringify(board))
    console.log()
    clipboard.clear()
    // clipboard.writeImage(nativeImage.createFromDataURL(canvasDiv.toDataURL()))
    // clipboard.writeText(JSON.stringify(board))
    clipboard.write({
      image: nativeImage.createFromDataURL(canvasDiv.toDataURL()),
      text: JSON.stringify(board),
    })
  }
})

ipcRenderer.on('paste', (e, arg)=> {
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

  // is there a boarddata with imageDataURL?
  // if so, insert new board and paste in board data
  // if only image type, create new board and paste in the nativeimage


})

ipcRenderer.on('setTool', (e, arg)=> {
  if (!textInputMode) {
    console.log('setTool', arg)
    switch(arg) {
      case 'lightPencil':
        sketchPane.setBrush(1, 0)
        sketchPane.setColor([200,200,255])
        break
      case 'pencil':
        sketchPane.setBrush(1, 20)
        sketchPane.setColor([50,50,50])
        break
      case 'pen':
        sketchPane.setBrush(4, 40)
        sketchPane.setColor([0,0,0])
        break
      case 'brush':
        sketchPane.setBrush(16, 0)
        sketchPane.setColor([100,100,100])
        break
      case 'eraser':
        sketchPane.setEraser()
        break
    }
  }
})

ipcRenderer.on('clear', (e, arg)=> {
  if (!textInputMode) {
    sketchPane.clear()
  }
})

ipcRenderer.on('brushSize', (e, arg)=> {
  if (!textInputMode) {
    sketchPane.setBrushSize(arg)
  }
})

// ipc.on('changeBrush', (event, arg)=> {
//   console.log("chagerwfsd")
//   switch(arg) {
//     case 'light':
//       sketchPane.setBrush(1, 0)
//       sketchPane.setColor([200,200,255])
//       beep()
//       break
//     case 'pencil':
//       sketchPane.setBrush(1, 20)
//       sketchPane.setColor([50,50,50])
//       beep()
//       break
//     case 'pen':
//       sketchPane.setBrush(4, 40)
//       sketchPane.setColor([0,0,0])
//       beep()
//       break
//     case 'brush':
//       sketchPane.setBrush(16, 0)
//       sketchPane.setColor([100,100,100])
//       beep()
//       break
//   }
// })

// ipc.on('clear', (event, arg)=> {
//   sketchPane.clear()
//   beep()
// })

// ipc.on('undo', (event, arg)=> {
//   sketchPane.undo()
//   beep()
// })

// ipc.on('redo', (event, arg)=> {
//   sketchPane.redo()
//   beep()
// })


ipcRenderer.on('deleteBoard', (event, args)=>{
  if (!textInputMode) {
    deleteBoard()
  }
})

ipcRenderer.on('duplicateBoard', (event, args)=>{
  if (!textInputMode) {
    duplicateBoard()
  }
})
