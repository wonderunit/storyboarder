const {ipcRenderer, shell, remote} = require('electron')
//const electronLocalshortcut = require('electron-localshortcut');
const fs = require('fs')
const moment = require('moment')
const menu = require('../menu.js')
const util = require('../wonderunit-utils.js')
const sfx = require('../wonderunit-sound.js')
const Color = require('color-js')


const sketchPane = require('../sketchpane.js')


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


menu.setMenu()

///////////////////////////////////////////////////////////////
// Loading / Init Operations
///////////////////////////////////////////////////////////////

ipcRenderer.on('load', (event, args)=>{

  /*
    if (scriptData) {
      load ui:
        scenes
        script's currentScene
    }
    open file
    check all board images actually exist
    calc stats for the boards
    load ui:
      sketch pane
      thumbs
      timeline
  }
  */

  //    mainWindow.webContents.send('load', [filename, scriptData, locations, characters, boardSettings, currentPath])


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
    boardPath = boardFilename.split('/')
    boardPath.pop()
    boardPath = boardPath.join('/')

    console.log(boardFilename)
    console.log(boardPath)
    console.log(boardData)


    /*
      get last scene
      render scenes
      render script for current scene
      if current scene boardfile / directory doesnt exist, create it
      load boardfile
    */

    assignColors()
    document.querySelector('#scenes').style.display = 'block'
    document.querySelector('#script').style.display = 'block'
    renderScenes()
    renderScript()

  } else {
    // if not, its just a simple single boarder file
    boardFilename = args[0]
    boardPath = boardFilename.split('/')
    boardPath.pop()
    boardPath = boardPath.join('/')
    console.log(boardPath)



    boardData = JSON.parse(fs.readFileSync(boardFilename))
  }



  loadBoardUI()

  

})

let loadBoardUI = ()=> {
  if (boardData.boards.length == 0) {
    // create a new board
    newBoard()
  }

  let aspectRatio = boardData.aspectRatio
  console.log(aspectRatio)
  //let aspectRatio = 1.77777
  if (aspectRatio >= 1) {
    document.querySelector('#board-canvas').height = 900
    document.querySelector('#board-canvas').width = (900*aspectRatio)
    document.querySelector('#drawing-canvas').height = 900
    document.querySelector('#drawing-canvas').width = (900*aspectRatio)
  } else {
    document.querySelector('#board-canvas').width = 900
    document.querySelector('#board-canvas').height = (900/aspectRatio)
    document.querySelector('#drawing-canvas').width = 900
    document.querySelector('#drawing-canvas').height = (900/aspectRatio)
  }
  sketchPane.init()
  sizeCanvas()
  // update sketchpane
  updateSketchPaneBoard()
  // update thumbail drawer
  updateThumbnailDrawer()
  // update timeline
  // update metadata
  setTimeout(sizeCanvas,100)

  console.log(boardFilename)
  console.log(currentPath)

  // //console.log(boardData.aspectRatio)


  // drawTestImage()


  // sizeCanvas()

  remote.getCurrentWindow().show()
  remote.getCurrentWebContents().openDevTools()

}

///////////////////////////////////////////////////////////////
// Board Operations
///////////////////////////////////////////////////////////////



let newBoard = (position)=> {
  if (!position) position = currentBoard

  // create array entry
  let uid = util.uidGen(5)

  let board = {
      "uid": uid,
      "url": 'board-' + (position+1) + '-' + uid + '.png' ,
      "newShot": false,
      "lastEdited": Date.now(),
    }
  // insert
  boardData.boards.push(board)
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
    let imageData = document.querySelector('#board-canvas').toDataURL('image/png')
    imageData = imageData.replace(/^data:image\/\w+;base64,/, '');
    let board = boardData.boards[currentBoard]
    let imageFilename = boardPath + '/images/' + board.url
    fs.writeFile(imageFilename, imageData, 'base64', function(err) {})
    console.log('saved IMAGE file!', imageFilename)
    imageFileDirty = false
  }
}


sketchPane.on('markDirty', markImageFileDirty)

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

  currentBoard = Math.max(currentBoard, 0)
  currentBoard = Math.min(currentBoard, boardData.boards.length-1)

  console.log(currentBoard)
  updateSketchPaneBoard()
}

let updateSketchPaneBoard = () => {
  // get current board
  let board = boardData.boards[currentBoard]
  // try to load url
  let imageFilename = boardPath + '/images/' + board.url
  let context = document.querySelector('#board-canvas').getContext('2d')
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
  console.log("update thumbnails")
    
  document.querySelector('#thumbnail-drawer')
  let html = []

  for (var board of boardData.boards) {
    console.log(board)


    let imageFilename = boardPath + '/images/' + board.url
    if (!fs.existsSync(imageFilename)){
      // bank image
      html.push(board.url)
    } else {
      html.push('<img src="' + imageFilename + '">')


 
    }



    
  }

  document.querySelector('#thumbnail-drawer').innerHTML = html.join('')

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
        html.push('<div class="section node" data-node="' + i + '">' + node.text + '</div>')
        break
      case 'scene':
        if (node.slugline) {
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
    node.addEventListener('pointerup', (e)=>{
      //console.log(e.target.dataset.node)
      currentScene = Number(e.target.dataset.node)
      loadScene(currentScene)
      renderScript()
      loadBoardUI()
    }, true, true)
  }


  document.querySelector('#scenes').addEventListener('pointerdown', (e)=>{
    dragTarget = document.querySelector('#scenes')
    dragTarget.style.overflow = 'hidden'
    dragMode = true
    dragPoint = [e.pageX, e.pageY]
    scrollPoint = [dragTarget.scrollLeft, dragTarget.scrollTop]
    console.log(e)
  })




  window.addEventListener('pointermove', (e)=>{
    if (dragMode) {
      dragTarget.scrollLeft = scrollPoint[0] + (dragPoint[0] - e.pageX)
      dragTarget.scrollTop = scrollPoint[1] + (dragPoint[1] - e.pageY)
    }
  })

  window.addEventListener('pointerup', (e)=>{
    if (dragMode) {
      dragMode = false
      dragTarget.style.overflow = 'scroll'
    }
  })





  // $("#outline .node").unbind('click').click((e)=>{
  //   stopPlaying()
  //   gotoFrame(e.currentTarget.dataset.node)
  // })
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

  // does the boardfile/directory exist?
  let boardsDirectoryFolders = fs.readdirSync(currentPath).filter(function(file) {
    return fs.statSync(currentPath + '/' + file).isDirectory()
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
          fs.mkdirSync(currentPath + '/' + directoryName)
          // make storyboarder file

          let newBoardObject = {
            aspectRatio: boardSettings.aspectRatio,
            fps: 24,
            defaultBoardTiming: 2000,
            boards: []
          }
          boardFilename = currentPath + '/' + directoryName + '/' + directoryName + '.storyboarder'
          boardData = newBoardObject
          fs.writeFileSync(boardFilename, JSON.stringify(newBoardObject))
          // make storyboards directory
          fs.mkdirSync(currentPath + '/' + directoryName + '/images')
          
        } else {
          // load storyboarder file
          console.log('load storyboarder!')
          console.log(foundDirectoryName)
          boardFilename = currentPath + '/' + foundDirectoryName + '/' + foundDirectoryName + '.storyboarder'
          boardData = JSON.parse(fs.readFileSync(boardFilename))
        }

        //check if boards scene exists in 

        break
      }
    }
  }
}

let sizeCanvas= () => {
  // get canvas aspect ratio
  // get area width and height
  // get padding area
  // compare aspect ratios to see where to limit
  // figure out zoom factor
  // center
  // offset
  let margin = 100

  let canvasDiv = document.querySelector('#board-canvas')
  let canvasContainerDiv = document.querySelector('#canvas-container')
  let sketchPaneDiv = document.querySelector('#sketch-pane')

  let canvasAspect = canvasDiv.width/canvasDiv.height
  let sketchPaneAspect = (sketchPaneDiv.offsetWidth-(margin*2))/(sketchPaneDiv.offsetHeight-(margin*2))

  if (canvasAspect >= sketchPaneAspect) {
    canvasContainerDiv.style.width = (sketchPaneDiv.offsetWidth-(margin*2)) + 'px'
    canvasContainerDiv.style.height = ((sketchPaneDiv.offsetWidth-(margin*2)) / canvasAspect) + 'px'
  } else {
    canvasContainerDiv.style.height = (sketchPaneDiv.offsetHeight-(margin*2)) + 'px'
    canvasContainerDiv.style.width = ((sketchPaneDiv.offsetHeight-(margin*2)) * canvasAspect) + 'px'
  }

  let scaleFactor = canvasContainerDiv.offsetWidth/canvasDiv.width

  // center
  canvasContainerDiv.style.left = Math.floor((sketchPaneDiv.offsetWidth - canvasContainerDiv.offsetWidth)/2) + 'px'
  canvasContainerDiv.style.top = Math.floor((sketchPaneDiv.offsetHeight - canvasContainerDiv.offsetHeight)/2) + 'px'

}

let scalePanImage = () => {
  let scaleFactor = canvasDiv.offsetWidth/canvasDiv.width
  console.log(scaleFactor)

  let scale = scaleFactor * 1.2
  canvasDiv.style.height 
}


sizeCanvas()


window.onresize = (e) => {
  console.log(document.querySelector('#sketch-pane').offsetWidth)
  sizeCanvas()
}

window.onkeydown = (e)=> {
  switch (e.code) {
    case 'ArrowLeft':
      goNextBoard(-1)
      break
    case 'ArrowRight':
      goNextBoard()
      break
  }
  console.log(e)
}


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
  newBoard()
})

ipcRenderer.on('goPreviousBoard', (event, args)=>{
  goNextBoard(-1)
})

ipcRenderer.on('goNextBoard', (event, args)=>{
  goNextBoard()
})

