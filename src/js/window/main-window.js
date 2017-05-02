const {ipcRenderer, shell, remote, nativeImage, clipboard} = require('electron')
const child_process = require('child_process')
//const electronLocalshortcut = require('electron-localshortcut');
const fs = require('fs')
const path = require('path')
const menu = require('../menu.js')
const util = require('../utils/index.js')
const Color = require('color-js')

const StoryboarderSketchPane = require('../storyboarder-sketch-pane.js')
const undoStack = require('../undo-stack.js')

const Toolbar = require('./toolbar.js')
const tooltips = require('./tooltips.js')
const ContextMenu = require('./context-menu.js')
const ColorPicker = require('./color-picker.js')
const Transport = require('./transport.js')
const notifications = require('./notifications.js')
const NotificationData = require('../../data/messages.json')
const Guides = require('./guides.js')
const Sonifier = require('./sonifier/index.js')
const sfx = require('../wonderunit-sound.js')

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

let layerStatus = {
  main:       { dirty: false },
  reference:  { dirty: false },
  notes:      { dirty: false }
}
let imageFileDirtyTimer

let isEditMode = false
let editModeTimer
let enableEditModeDelay = 750 // msecs
let periodicDragUpdateTimer
let periodicDragUpdatePeriod = 30 // msecs
let mouseDragStartX

let textInputMode = false
let textInputAllowAdvance = false

let viewMode = 0

let selections = new Set()

let thumbnailCursor = {
  visible: false,
  x: 0,
  el: null
}

let lastPointer = { x: null, y: null }

let toolbar
let contextMenu
let colorPicker
let transport
let guides

let storyboarderSketchPane
let mainCanvas

menu.setMenu()

///////////////////////////////////////////////////////////////
// Loading / Init Operations
///////////////////////////////////////////////////////////////

const load = (event, args) => {
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
}
ipcRenderer.on('load', load)


let addToLineMileage = value => {
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

  if (aspectRatio >= 1) {
    size = [900 * aspectRatio, 900]
  } else {
    size = [900, 900 / aspectRatio]
  }




  storyboarderSketchPane = new StoryboarderSketchPane(
    document.getElementById('storyboarder-sketch-pane'),
    size
  )
  mainCanvas = storyboarderSketchPane.getLayerCanvasByName('main')
  window.addEventListener('resize', () => {
    resize()
    storyboarderSketchPane.resize()
  })
  storyboarderSketchPane.on('addToUndoStack', () => {
    storeUndoStateForImage(true)
  })
  storyboarderSketchPane.on('markDirty', () => {
    storeUndoStateForImage(false)
    markImageFileDirty()
  })
  storyboarderSketchPane.on('lineMileage', value => {
    addToLineMileage(value)
  })



  let sketchPaneEl = document.querySelector('#storyboarder-sketch-pane')

  let captionEl = document.createElement('div')
  captionEl.id = 'canvas-caption'
  sketchPaneEl.appendChild(captionEl)



  for (var item of document.querySelectorAll('#board-metadata input, textarea')) {
    item.addEventListener('focus', (e)=> {
      textInputMode = true
      textInputAllowAdvance = false
      switch (e.target.name) {
        case 'duration':
        case 'frames':
          textInputAllowAdvance = true
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
          sfx.playEffect(e.target.checked ? 'on' : 'off')
          markBoardFileDirty()
          textInputMode = false
          break
      }
      renderThumbnailDrawer()
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
      mouseDragStartX = e.clientX
      periodicDragUpdate()
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
    lastPointer = { x: e.clientX, y: e.clientY }

    // if you move enough,
    // we switch into dragging mode
    // and clear any possible editModeTimer
    if (Math.abs(mouseDragStartX - e.clientX) > 15 * boardData.aspectRatio) {
      clearTimeout(editModeTimer)
    }

    if (isEditMode && dragMode) {
      // defer to periodicDragUpdate()
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
      disableDragMode()
    }

    mouseDragStartX = null
    clearTimeout(editModeTimer)

    console.log('pointerup', isEditMode)
    if (isEditMode) {
      let x = e.clientX, y = e.clientY

      // 1) try to find nearest thumbnail, otherwise,
      // HACK 2) try to find last known thumbnail position
      let el = thumbnailFromPoint(x, y) || thumbnailCursor.el

      if (!el) {
        console.warn("couldn't find nearest thumbnail")
      }

      let index
      if (isBeforeFirstThumbnail(x, y)) {
        index = 0
      } else if (el) {
        index = Number(el.dataset.thumbnail) + 1
      }

      if (!util.isUndefined(index)) {
        console.log('user requests move operation:', selections, 'to insert after', index)
        saveImageFile()
        moveSelectedBoards(index)
        renderThumbnailDrawer()
        gotoBoard(currentBoard, true)
      } else {
        console.log('could not find point for move operation')
      }

      disableEditMode()
    }
  })

  toolbar = new Toolbar(document.getElementById("toolbar"))
  toolbar.on('add', () => {
    newBoard()
    gotoBoard(currentBoard+1)
  })
  toolbar.on('delete', () => {
    deleteBoards()
  })
  toolbar.on('duplicate', () => {
    duplicateBoard()
  })
  toolbar.on('import', () => {
    alert('Import. This feature is not ready yet :(')
  })
  toolbar.on('print', () => {
    alert('Print. This feature is not ready yet :(')
  })

  toolbar.on('brush', (kind, options) => {
    storyboarderSketchPane.setBrushTool(kind, options)
    sfx.playEffect('tool-' + kind)
  })
  toolbar.on('brush:size', size => {
    storyboarderSketchPane.setBrushSize(size)
  })
  toolbar.on('brush:color', color => {
    storyboarderSketchPane.setBrushColor(color)
  })

  toolbar.on('trash', () => {
    storyboarderSketchPane.clearLayer()
    sfx.playEffect('trash')
  })
  toolbar.on('fill', color => {
    storyboarderSketchPane.fillLayer(color.toCSS())
    sfx.playEffect('fill')
  })


  toolbar.on('move', () => {
    // sketchPane.moveContents()
  })
  toolbar.on('scale', () => {
    // sketchPane.scaleContents()
  })
  toolbar.on('cancelTransform', () => {
    // sketchPane.cancelTransform()
  })
  // sketchPane.on('moveMode', enabled => {
  //   if (enabled) {
  //     toolbar.setState({ transformMode: 'move' })
  //   }
  // })
  // sketchPane.on('scaleMode', enabled => {
  //   if (enabled) {
  //     toolbar.setState({ transformMode: 'scale' })
  //   }
  // })
  // sketchPane.on('cancelTransform', () => {
  //   toolbar.setState({ transformMode: null })
  // })


  toolbar.on('undo', () => {
    undoStack.undo()
    markImageFileDirty()
  })
  toolbar.on('redo', () => {
    undoStack.redo()
    markImageFileDirty()
  })
  
  toolbar.on('grid', value => {
    guides.setState({ grid: value })
  })
  toolbar.on('center', value => {
    guides.setState({ center: value })
  })
  toolbar.on('thirds', value => {
    guides.setState({ thirds: value })
  })
  toolbar.on('diagonals', value => {
    guides.setState({ diagonals: value })
  })
  toolbar.on('onion', () => {
    alert('Onion Skin. This feature is not ready yet :(')
  })
  toolbar.on('captions', () => {
    // HACK!!!
    let el = document.querySelector('#canvas-caption')
    el.style.visibility = el.style.visibility == 'hidden'
      ? 'visible'
      : 'hidden'
  })

  sfx.setMute(true)
  toolbar.setState({ brush: 'pencil' })
  sfx.setMute(false)



  tooltips.init()




  transport = new Transport()
  transport.on('previousScene', () => {
    previousScene()
  })
  transport.on('prevBoard', () => {
    goNextBoard(-1)
  })
  transport.on('togglePlayback', () => {
    togglePlayback()
  })
  transport.on('nextBoard', () => {
    goNextBoard(+1)
  })
  transport.on('nextScene', () => {
    nextScene()
  })

  notifications.init(document.getElementById('notifications'))
  setupRandomizedNotifications()

  //
  //
  // Current Color, Palette, and Color Picker connections
  //
  colorPicker = new ColorPicker()
  const setCurrentColor = color => {
    storyboarderSketchPane.setBrushColor(color)
    toolbar.changeCurrentColor(color)
    colorPicker.setState({ color: color.toCSS() })
  }
  const setPaletteColor = (brush, index, color) => {
    toolbar.changePaletteColor(brush, index, color)
    colorPicker.setState({ color: color.toCSS() })
  }
  toolbar.on('current-color-picker', color => {
    colorPicker.attachTo(document.getElementById('toolbar-current-color'))
    colorPicker.removeAllListeners('color') // HACK

    // initialize color picker active swatch
    colorPicker.setState({ color: color.toCSS() })

    colorPicker.addListener('color', setCurrentColor)
  })
  toolbar.on('palette-color-picker', (color, target, brush, index) => {
    colorPicker.attachTo(target)
    colorPicker.removeAllListeners('color') // HACK

    // initialize color picker active swatch
    colorPicker.setState({ color: color.toCSS() })

    colorPicker.addListener('color', setPaletteColor.bind(this, brush, index))
  })
  toolbar.on('current-set-color', color => {
    storyboarderSketchPane.setBrushColor(color)
    toolbar.changeCurrentColor(color)
  })

  guides = new Guides(storyboarderSketchPane.getLayerCanvasByName('guides'))


  sfx.init()

  storyboarderSketchPane.on('pointerdown', Sonifier.start)
  storyboarderSketchPane.on('pointermove', Sonifier.trigger)
  storyboarderSketchPane.sketchPane.on('onup', Sonifier.stop)
  Sonifier.init(storyboarderSketchPane.sketchPane.getCanvasSize())
  window.addEventListener('resize', () => {
    Sonifier.setSize(storyboarderSketchPane.sketchPane.getCanvasSize())
  })

  let onUndoStackAction = (state) => {
    if (state.type == 'image') {
      applyUndoStateForImage(state)
    } else if (state.type == 'scene') {
      saveImageFile() // needed for redo
      applyUndoStateForScene(state)
    }
  }
  undoStack.on('undo', onUndoStackAction)
  undoStack.on('redo', onUndoStackAction)



  // Devtools
  ipcRenderer.on('devtools-focused', () => {
    // devtools-focused
    textInputMode = true
  })
  ipcRenderer.on('devtools-closed', () => {
    // devtools-closed
    textInputMode = false
  })
  window.addEventListener('focus', () => {
    // devtools-blur
    textInputMode = false
  })

  resize()

  setTimeout(()=>{remote.getCurrentWindow().show()}, 200)
  //remote.getCurrentWebContents().openDevTools()
}

let updateBoardUI = ()=> {
  document.querySelector('#canvas-caption').style.display = 'none'
  renderViewMode()

  if (boardData.boards.length == 0) {
    // create a new board
    newBoard(0, false)
  }
  // update sketchpane
  updateSketchPaneBoard()
  // update thumbail drawer
  renderThumbnailDrawer()
  // update timeline
  // update metadata
  gotoBoard(currentBoard)
}

///////////////////////////////////////////////////////////////
// Board Operations
///////////////////////////////////////////////////////////////

let newBoard = (position, shouldAddToUndoStack = true) => {
  if (shouldAddToUndoStack) {
    storeUndoStateForScene(true)
  }
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
  markImageFileDirty() // to save new layers
  markBoardFileDirty() // to save new board data
  renderThumbnailDrawer()
  storeUndoStateForScene()
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
    fs.writeFileSync(boardFilename, JSON.stringify(boardData, null, 2))
    console.log('saved board file!', boardFilename)
    boardFileDirty = false
  }
}

let markImageFileDirty = () => {
  let layerName = storyboarderSketchPane.getCurrentLayerName()
  layerStatus[layerName].dirty = true
  clearTimeout(imageFileDirtyTimer)
  imageFileDirtyTimer = setTimeout(() => {
    saveImageFile()
  }, 5000)
}

let saveImageFile = () => {
  let board = boardData.boards[currentBoard]

  let layersData = [
    ['main', board.url],
    ['reference', board.url.replace('.png', '-reference.png')],
    ['notes', board.url.replace('.png', '-notes.png')]
  ]

  let savers = []

  for (let [layerName, filename] of layersData) {
    if (layerStatus[layerName].dirty) {
      clearTimeout(imageFileDirtyTimer)

      let canvas = storyboarderSketchPane.getLayerCanvasByName(layerName)
      let imageFilePath = path.join(boardPath, 'images', filename)

      let imageData = canvas
        .toDataURL('image/png')
        .replace(/^data:image\/\w+;base64,/, '')

      savers.push(new Promise((resolve, reject) => {
        try {
          fs.writeFile(
            imageFilePath,
            imageData,
            'base64',
            err => {
              if (err) {
                console.error(err)
                reject(err)
                return
              }

              // add to boardData if it doesn't already exist
              if (layerName !== 'main') {
                board.layers = board.layers || {}

                if (!board.layers[layerName]) {
                  board.layers[layerName] = { url: filename }
                  console.log('added', layerName, 'to board .layers data')

                  // immediately save board file
                  saveBoardFile()
                }
              }

              layerStatus[layerName].dirty = false
              console.log('\tsaved', layerName, 'to', filename)
              resolve()
            }
          )
        } catch (err) {
          reject(err)
        }
      }))

    }
  }

  Promise.all(savers)
    .then(() => {
      console.log(`saved ${savers.length} modified layers`)

      // update the thumbnail
      let imageFilePath = path.join(boardPath, 'images', board.url)
      setTimeout(imageFilePath => {
        document.querySelector(`[data-thumbnail="${currentBoard}"] img`).src = imageFilePath + '?' + Date.now()
      }, 100, imageFilePath)
    })
    .catch(err => {
      console.error(err)
    })
}

let deleteSingleBoard = (index) => {
  if (boardData.boards.length > 1) {
    boardData.boards.splice(index, 1)
    markBoardFileDirty()
    renderThumbnailDrawer()
  }
}

let deleteBoards = (args)=> {
  if (selections.size) {
    storeUndoStateForScene(true)

    // delete all selected boards
    let arr = [...selections]
    arr.sort(util.compareNumbers).reverse().forEach(n =>
      deleteSingleBoard(n))

    if (selections.has(currentBoard)) {
      // if not requested to move forward
      // we take action to move intentionally backward
      if (!args) {
        currentBoard--
      }
    }

    // clear and re-render selections
    selections.clear()
    renderThumbnailDrawer()
    storeUndoStateForScene()
  } else {
    // delete a single board
    storeUndoStateForScene(true)
    deleteSingleBoard(currentBoard)
    storeUndoStateForScene()

    // if not requested to move forward
    // we take action to move intentionally backward
    if (!args) {
      currentBoard--
    }
  }
  gotoBoard(currentBoard)
}

let duplicateBoard = ()=> {
  storeUndoStateForScene(true)
  saveImageFile()
  // copy current board canvas
  let imageData = mainCanvas.getContext("2d").getImageData(0,0, mainCanvas.width, mainCanvas.height)
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
  mainCanvas.getContext("2d").putImageData(imageData, 0, 0)
  markImageFileDirty()
  saveImageFile()
  renderThumbnailDrawer()
  gotoBoard(currentBoard)
  storeUndoStateForScene()
}

///////////////////////////////////////////////////////////////
// UI Rendering
///////////////////////////////////////////////////////////////

let goNextBoard = (direction, shouldPreserveSelections = false)=> {
  saveImageFile()
  if (direction) {
    currentBoard += direction
  } else {
    currentBoard++
  }
  gotoBoard(currentBoard, shouldPreserveSelections)
}

let gotoBoard = (boardNumber, shouldPreserveSelections = false) => {
  return new Promise((resolve, reject) => {
    currentBoard = boardNumber
    currentBoard = Math.max(currentBoard, 0)
    currentBoard = Math.min(currentBoard, boardData.boards.length-1)
    
    if (!shouldPreserveSelections) selections.clear()
    selections = new Set([...selections.add(currentBoard)].sort(util.compareNumbers))
    renderThumbnailDrawerSelections()
    
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
    renderMarkerPosition()
    
    updateSketchPaneBoard().then(() => resolve()).catch(e => console.error(e))
  })
}

let renderMarkerPosition = () => {
  let curr = boardData.boards[currentBoard]
  let last = boardData.boards[boardData.boards.length - 1]

  let percentage
  if (last.duration) {
    percentage = (curr.time)/(last.time+last.duration)
  } else {
    percentage = (curr.time)/(last.time+2000)
  }

  let width = document.querySelector('#timeline #movie-timeline-content').offsetWidth
  document.querySelector('#timeline .marker').style.left = (width*percentage) + 'px'

  document.querySelector('#timeline .left-block').innerHTML = util.msToTime(curr.time)

  let totalTime
  if (last.duration) {
    totalTime = (last.time+last.duration)
  } else {
    totalTime = (last.time+2000)
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
  }
  if (!boardData.boards[currentBoard].dialogue) {
    document.querySelector('#canvas-caption').style.display = 'none'
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


  renderStats()
}

const renderStats = () => {
  //
  //
  // left stats
  //
  let primaryStats = []
  let secondaryStats = []

  if (!util.isUndefined(scriptData)) {
    primaryStats.push( `SCENE ${currentScene + 1} SHOT ${boardData.boards[currentBoard].shot}` )
  } else {
    primaryStats.push( `SHOT ${boardData.boards[currentBoard].shot}` )
  }

  let stats = []
  let totalNewShots = boardData.boards.reduce((a, b) => a + (b.newShot ? 1 : 0), 0) || 1
  secondaryStats.push( 
    `${boardData.boards.length} ${util.pluralize(boardData.boards.length, 'board').toUpperCase()}, ` +
    `${totalNewShots} ${util.pluralize(totalNewShots, 'shot').toUpperCase()}`
  )
  
  let totalLineMileage = boardData.boards.reduce((a, b) => a + (b.lineMileage || 0), 0)
  let avgLineMileage = totalLineMileage / boardData.boards.length
  secondaryStats.push( (avgLineMileage/5280).toFixed(1) + ' AVG. LINE MILEAGE' )

  document.querySelector('#left-stats .stats-primary').innerHTML = primaryStats.join('<br />')
  document.querySelector('#left-stats .stats-secondary').innerHTML = secondaryStats.join('<br />')



  //
  //
  // right stats
  //
  // if (scriptData) {
  //   let numScenes = scriptData.filter(data => data.type == 'scene').length
  
  //   let numBoards = 'N' // TODO sum total number of boards in the script
  
  //   document.querySelector('#right-stats .stats-primary').innerHTML = `${numScenes} SCENES ${numBoards} BOARDS`
  // } else {
  //   let numBoards = boardData.boards.length
  //   document.querySelector('#right-stats .stats-primary').innerHTML = `${numBoards} BOARDS`
  // }
  // document.querySelector('#right-stats .stats-secondary').innerHTML = `AVG BOARDS PER SCENE, TOTAL TIME`


  document.querySelector('#right-stats').style.visibility = 'hidden' // HACK hide right stats for now, until we have real data

  if (
    (scriptData && viewMode == 5) ||
    (!scriptData && viewMode == 3)
  ) {
    document.getElementById('left-stats').classList.add('stats__large')
    document.getElementById('right-stats').classList.add('stats__large')

    document.querySelector('#right-stats').style.display = 'none' // HACK hide right stats for now, until we have real data
    document.querySelector('#left-stats').style.textAlign = 'center' // HACK
  } else {
    document.getElementById('left-stats').classList.remove('stats__large')
    document.getElementById('right-stats').classList.remove('stats__large')

    document.querySelector('#right-stats').style.display = 'flex' // HACK hide right stats for now, until we have real data
    document.querySelector('#left-stats').style.textAlign = 'left' // HACK
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

// load layer images
let updateSketchPaneBoard = () => {
  return new Promise((resolve, reject) => {
    // get current board
    let board = boardData.boards[currentBoard]

    console.log('loading layers')

    let layersData = [
      ['main', board.url],
      ['reference', board.url.replace('.png', '-reference.png')],
      ['notes', board.url.replace('.png', '-notes.png')]
    ]

    let loaders = []
    for (let [layerName, filename] of layersData) {
      loaders.push(new Promise((resolve, reject) => {
        let imageFilePath = path.join(boardPath, 'images', filename)
        
        console.log('loading layer', layerName, 'from', imageFilePath)

        let context = storyboarderSketchPane.getLayerCanvasByName(layerName).getContext('2d')
        context.globalAlpha = 1

        context.clearRect(0, 0, context.canvas.width, context.canvas.height)

        if (!fs.existsSync(imageFilePath)) {
          resolve()
        } else {
          let image = new Image()
          image.onload = () => {
            context.drawImage(image, 0, 0)
            resolve()
          }
          image.src = imageFilePath + '?' + Math.random()
        }
      }))
    }

    Promise.all(loaders).then(resolve)
  })
}

let renderThumbnailDrawerSelections = () => {
  let thumbnails = document.querySelectorAll('.thumbnail')

  for (let thumb of thumbnails) {
    let i = Number(thumb.dataset.thumbnail)

    thumb.classList.toggle('active', currentBoard == i)
    thumb.classList.toggle('selected', selections.has(i))
    thumb.classList.toggle('editing', isEditMode)
  }
}

let renderThumbnailDrawer = ()=> {
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

  renderThumbnailButtons()

  renderThumbnailDrawerSelections()

  if (!contextMenu) {
    contextMenu = new ContextMenu()
    // internal
    contextMenu.on('pointerleave', () => {
      contextMenu.remove()
    })

    // external
    contextMenu.on('add', () => {
      newBoard()
      gotoBoard(currentBoard+1)
    })
    contextMenu.on('delete', () => {
      deleteBoards()
    })
    contextMenu.on('duplicate', () => {
      duplicateBoard()
    })
    contextMenu.on('copy', () => {
      copyBoards()
    })
    contextMenu.on('paste', () => {
      pasteBoards()
    })
    contextMenu.on('import', () => {
      alert('Import. Coming Soon!')
    })
    contextMenu.on('reorder-left', () => {
      reorderBoardsLeft()
    })
    contextMenu.on('reorder-right', () => {
      reorderBoardsRight()
    })
  }

  let thumbnails = document.querySelectorAll('.thumbnail')
  for (var thumb of thumbnails) {
    thumb.addEventListener('pointerenter', (e) => {
      if (!isEditMode && selections.size <= 1 && e.target.dataset.thumbnail == currentBoard) {
        contextMenu.attachTo(e.target)
      }
    })
    thumb.addEventListener('pointerleave', (e) => {
      if (!contextMenu.hasChild(e.relatedTarget)) {
        contextMenu.remove()
      }
    })
    thumb.addEventListener('pointermove', (e) => {
      if (!isEditMode && selections.size <= 1 && e.target.dataset.thumbnail == currentBoard) {
        contextMenu.attachTo(e.target)
      }
    })
    thumb.addEventListener('pointerdown', (e)=>{
      console.log("DOWN")
      if (!isEditMode && selections.size <= 1) contextMenu.attachTo(e.target)

      // always track cursor position
      updateThumbnailCursor(e.clientX, e.clientY)
      editModeTimer = setTimeout(enableEditMode, enableEditModeDelay)

      let index = Number(e.target.dataset.thumbnail)
      if (selections.has(index)) {
        // ignore
      } else if (e.shiftKey) {

        if (selections.size == 0 && !util.isUndefined(currentBoard)) {
          // use currentBoard as starting point
          selections.add(currentBoard)
        }

        // add to selections
        let min = Math.min(...selections, index)
        let max = Math.max(...selections, index)
        selections = new Set(util.range(min, max))

        renderThumbnailDrawerSelections()
      } else if (currentBoard !== index) {
        // go to board by index
        
        // reset selections
        selections.clear()

        saveImageFile()
        currentBoard = index
        renderThumbnailDrawerSelections()
        gotoBoard(currentBoard)
      }
    }, true, true)
  }

  renderThumbnailButtons()
  renderTimeline()

  //gotoBoard(currentBoard)
}

let renderThumbnailButtons = () => {
  if (!document.getElementById('thumbnail-add-btn')) {
    let drawerEl = document.getElementById('thumbnail-drawer')

    let el = document.createElement('div')
    el.dataset.tooltip = true
    el.dataset.tooltipTitle = 'New Board'
    el.dataset.tooltipDescription = 'Create a new board and draw some new shit. Then press N again and draw some more shit.'
    el.dataset.tooltipKeys = 'N'
    el.dataset.tooltipPosition = 'top center'
    el.id = 'thumbnail-add-btn'
    el.style.width = 60 + 'px'
    el.innerHTML = `
      <div class="icon">✚</div>
    `
    drawerEl.appendChild(el)
    
    el.addEventListener('pointerdown', event => {
      newBoard(boardData.boards.length)
      gotoBoard(boardData.boards.length)
    })
    
    tooltips.setupTooltipForElement(el)
  }
}

let renderTimeline = () => {
  // HACK store original position of marker
  let getMarkerEl = () => document.querySelector('#timeline .marker')
  let markerLeft = getMarkerEl() ? getMarkerEl().style.left : '0px'

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

  // HACK restore original position of marker
  if (getMarkerEl()) getMarkerEl().style.left = markerLeft
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
  // console.log('renderScript currentScene:', currentScene)
  let sceneCount = 0
  let html = []
  for (var node of scriptData ) {
    if (node.type == 'scene') {
      if (node.scene_number == (currentScene+1)) {
        let notes = node.slugline + '\n' + node.synopsis
        html.push('<div class="item slugline" data-notes="' + notes + '" data-duration="' + node.duration + '"><div class="number" style="pointer-events: none">SCENE ' + node.scene_number + ' - ' +  util.msToTime(node.duration) + '</div>')

        html.push('<div style="pointer-events: none">' + node.slugline + '</div>')
        if (node.synopsis) {
          html.push('<div class="synopsis" style="pointer-events: none">' + node.synopsis + '</div>')
        }

        html.push('</div>')
        for (var item of node.script) {
          let durationAsDataAttr = item.duration ? ` data-duration="${item.duration}"` : ''
          switch (item.type) {
            case 'action':
              html.push('<div class="item" data-notes="' + item.text + '"' + durationAsDataAttr + '>' + item.text + '</div>')
              break
            case 'dialogue':
              html.push('<div class="item" data-dialogue="' + item.text + '"' + durationAsDataAttr + '>' + item.character + '<div class="dialogue" style="pointer-events: none">' + item.text + '</div></div>')
              break
            case 'transition':
              html.push('<div class="item transition" data-notes="' + item.text + '"' + durationAsDataAttr + '>' + item.text + '</div>')
              break
          }
        }
        break
      }
      sceneCount++
    }
  }
  document.querySelector('#script').innerHTML = html.join('')

  let scriptNodes = document.querySelectorAll('#script .item')
  for (let node of scriptNodes) {
    node.addEventListener('dblclick', event => {
      let duration, dialogue, action, notes
      let shouldConfirm = false

      if (event.target.dataset.duration) {
        duration = event.target.dataset.duration
      }
      if (event.target.dataset.dialogue) {
        dialogue = event.target.dataset.dialogue
      }
      if (event.target.dataset.action) {
        action = event.target.dataset.action
      }
      if (event.target.dataset.notes) {
        notes = event.target.dataset.notes
      }

      if (duration || dialogue || action || notes) {
        let board = boardData.boards[currentBoard]

        if (duration && board.duration) shouldConfirm = true
        if (dialogue && board.dialogue) shouldConfirm = true
        if (action && board.action) shouldConfirm = true
        if (notes && board.notes) shouldConfirm = true

        let canWrite
        if (shouldConfirm) {
          canWrite = confirm(
            'This board’s metadata will be overwritten. Are you sure?'
          )
        } else {
          canWrite = true
        }

        if (canWrite && duration) board.duration = duration
        if (canWrite && dialogue) board.dialogue = dialogue
        if (canWrite && action) board.action = action
        if (canWrite && notes) board.notes = notes

        renderMetaData()
      }
    }, true, true)
  }
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

let setDragTarget = (x) => {
  let containerRect = dragTarget.getBoundingClientRect()

  let mouseX = x - containerRect.left
  let midpointX = containerRect.width / 2
  
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
}

let updateDrag = () => {
  if (util.isUndefined(lastPointer.x) || util.isUndefined(lastPointer.y)) {
    return
  }

  
  if (isEditMode && dragMode) {
    setDragTarget(lastPointer.x)
    updateThumbnailCursor(lastPointer.x, lastPointer.y)
    renderThumbnailCursor()
  }
}

let periodicDragUpdate = () => {
  updateDrag()
  periodicDragUpdateTimer = setTimeout(periodicDragUpdate, periodicDragUpdatePeriod)
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

const resize = () => {
  // measure the main area
  const mainEl = document.getElementById('storyboarder-main')
  const toolbarEl = document.getElementById('toolbar')
  if (mainEl && toolbarEl) {
    const rect = mainEl.getBoundingClientRect()
    const isReducedWidth = rect.width < 1505
    toolbarEl.classList.toggle('with-reduced-width', isReducedWidth)
  }
}

window.onkeydown = (e)=> {
  if (!textInputMode) {

    console.log(e)

    switch (e.code) {
      case 'KeyC':
        if (e.metaKey || e.ctrlKey) {
          copyBoards()
          e.preventDefault()
        }
        break
      case 'KeyV':
        if (e.metaKey || e.ctrlKey) {
          pasteBoards()
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
        cycleViewMode()
        e.preventDefault()
        break;
      case 'Escape':
        if (dragMode && isEditMode && selections.size) {
          disableEditMode()
          disableDragMode()
        }
        break
    }

  }

  if (!textInputMode || textInputAllowAdvance) {

    console.log(e)

    switch (e.code) {
      case 'ArrowLeft':
        if (e.metaKey || e.ctrlKey) {
          previousScene()
        } else if (e.altKey) {
          reorderBoardsLeft()
        } else {
          let shouldPreserveSelections = e.shiftKey
          goNextBoard(-1, shouldPreserveSelections)
        }
        e.preventDefault()
        break
      case 'ArrowRight':
        if (e.metaKey || e.ctrlKey) {
          nextScene()
        } else if (e.altKey) {
          reorderBoardsRight()
        } else {
          let shouldPreserveSelections = e.shiftKey
          goNextBoard(1, shouldPreserveSelections)
        }
        e.preventDefault()
        break
    }
  }

  contextMenu && contextMenu.remove()
}

let disableDragMode = () => {
  clearTimeout(periodicDragUpdateTimer)
  dragMode = false
  dragTarget.style.overflow = 'scroll'
  dragTarget.style.scrollBehavior = 'smooth'
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
  if (transport) transport.setState({ playbackMode })
}

let togglePlayback = ()=> {
  playbackMode = !playbackMode
  if (playbackMode) {
    ipcRenderer.send('preventSleep')
    playAdvance(true)
  } else {
    stopPlaying()
  }
  transport.setState({ playbackMode })
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

let cycleViewMode = ()=> {
  if (scriptData) {
    viewMode = ((viewMode+1)%6)
    switch (viewMode) {
      case 0:
        document.querySelector('#scenes').style.display = 'block'
        document.querySelector('#script').style.display = 'block'
        document.querySelector('#board-metadata').style.display = 'flex'
        document.querySelector('#toolbar').style.display = 'flex'
        document.querySelector('#thumbnail-container').style.display = 'block'
        document.querySelector('#timeline').style.display = 'flex'
        document.querySelector('#playback #icons').style.display = 'flex'
        break
      case 1:
        document.querySelector('#scenes').style.display = 'none'
        document.querySelector('#script').style.display = 'block'
        document.querySelector('#board-metadata').style.display = 'flex'
        document.querySelector('#toolbar').style.display = 'flex'
        break
      case 2:
        document.querySelector('#scenes').style.display = 'none'
        document.querySelector('#script').style.display = 'none'
        document.querySelector('#board-metadata').style.display = 'flex'
        document.querySelector('#toolbar').style.display = 'flex'
        break
      case 3:
        document.querySelector('#scenes').style.display = 'none'
        document.querySelector('#script').style.display = 'none'
        document.querySelector('#board-metadata').style.display = 'none'
        document.querySelector('#toolbar').style.display = 'flex'
        break
      case 4:
        document.querySelector('#scenes').style.display = 'none'
        document.querySelector('#script').style.display = 'none'
        document.querySelector('#board-metadata').style.display = 'none'
        document.querySelector('#toolbar').style.display = 'none'
        document.querySelector('#thumbnail-container').style.display = 'block'
        document.querySelector('#timeline').style.display = 'flex'
        break
      case 5:
        document.querySelector('#scenes').style.display = 'none'
        document.querySelector('#script').style.display = 'none'
        document.querySelector('#board-metadata').style.display = 'none'
        document.querySelector('#toolbar').style.display = 'none'
        document.querySelector('#thumbnail-container').style.display = 'none'
        document.querySelector('#timeline').style.display = 'none'
        document.querySelector('#playback #icons').style.display = 'none'
        break
    }
  } else {
    viewMode = ((viewMode+1)%4)
    switch (viewMode) {
      case 0:
        document.querySelector('#scenes').style.display = 'none'
        document.querySelector('#script').style.display = 'none'
        document.querySelector('#board-metadata').style.display = 'flex'
        document.querySelector('#toolbar').style.display = 'flex'
        document.querySelector('#thumbnail-container').style.display = 'block'
        document.querySelector('#timeline').style.display = 'flex'
        document.querySelector('#playback #icons').style.display = 'flex'
        break
      case 1:
        document.querySelector('#scenes').style.display = 'none'
        document.querySelector('#script').style.display = 'none'
        document.querySelector('#board-metadata').style.display = 'none'
        document.querySelector('#toolbar').style.display = 'flex'
        break
      case 2:
        document.querySelector('#scenes').style.display = 'none'
        document.querySelector('#script').style.display = 'none'
        document.querySelector('#board-metadata').style.display = 'none'
        document.querySelector('#toolbar').style.display = 'none'
        document.querySelector('#thumbnail-container').style.display = 'block'
        document.querySelector('#timeline').style.display = 'flex'
        break
      case 3:
        document.querySelector('#scenes').style.display = 'none'
        document.querySelector('#script').style.display = 'none'
        document.querySelector('#board-metadata').style.display = 'none'
        document.querySelector('#toolbar').style.display = 'none'
        document.querySelector('#thumbnail-container').style.display = 'none'
        document.querySelector('#timeline').style.display = 'none'
        document.querySelector('#playback #icons').style.display = 'none'
        break
    }
  }
  storyboarderSketchPane.resize()
  renderViewMode()
  renderStats()
}

const renderViewMode = () => {
  document.body.classList.toggle(
    'with-script-visible',
    document.querySelector('#script').style.display == 'block'
  )
  document.body.classList.toggle(
    'with-scenes-visible',
    document.querySelector('#scenes').style.display == 'block'
  )
}

const toggleCaptions = () => {
  toolbar.toggleCaptions()
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

let loadPNGImageFileAsDataURI = (filepath) => {
  if (!fs.existsSync(filepath)) return null

  // via https://gist.github.com/mklabs/1260228/71d62802f82e5ac0bd97fcbd54b1214f501f7e77
  let data = fs.readFileSync(filepath).toString('base64')
  return `data:image/png;base64,${data}`
}

let copyBoards = ()=> {
  if (textInputMode) return // ignore copy command in text input mode

  // copy more than one boards
  if (selections.size > 1) {
    if (selections.has(currentBoard)) {
      saveImageFile()
    }

    // grab data for each board
    let boards = [...selections].sort(util.compareNumbers).map(n => util.stringifyClone(boardData.boards[n]))
    
    // inject image data for each board
    boards = boards.map(board => {
      let filepath = path.join(boardPath, 'images', board.url)
      let data = loadPNGImageFileAsDataURI(filepath)
      if (data) {
        board.imageDataURL = data
      } else {
        console.warn("could not load image data for that board")
      }
      return board
    })

    let payload = {
      text: JSON.stringify({ boards: boards })
    }
    clipboard.clear()
    clipboard.write(payload)
    return
  }
  
  // copy a single board (the current board)
  // if you have only one board in your selection, we copy the current board
  //
  // assumes that UI only allows a single selection when it is also the current board
  //
  let board = JSON.parse(JSON.stringify(boardData.boards[currentBoard]))
  let canvasDiv = mainCanvas
  board.imageDataURL = canvasDiv.toDataURL()
  payload = {
    image: nativeImage.createFromDataURL(canvasDiv.toDataURL()),
    text: JSON.stringify(board)
  }
  clipboard.clear()
  clipboard.write(payload)
}

let importImage = (imageDataURL) => {
  // TODO: undo
  var image = new Image()
  image.src = imageDataURL

  let targetWidth
  let targetHeight
  let offsetX
  let offsetY

  console.log(boardData.aspectRatio)
  console.log((image.height/image.width))
  if (boardData.aspectRatio > (image.height/image.width)) {
    targetHeight = 900
    targetWidth = 900 * (image.width/image.height)

    offsetX = Math.round(((900 * boardData.aspectRatio) - targetWidth)/2)
    offsetY = 0
  } else {
    targetWidth = 900 * boardData.aspectRatio
    targetHeight = targetWidth * (image.width/image.height)

    offsetY = Math.round(900 - targetHeight)
    offsetX = 0
  }


  // render
  mainCanvas.getContext("2d").drawImage(image, offsetX, offsetY, targetWidth, targetHeight)
  markImageFileDirty()
  saveImageFile()
}


let pasteBoards = () => {
  if (textInputMode) return

  console.log("paste")
  storeUndoStateForScene(true)

  let newBoards

  // check whats in the clipboard
  let clipboardText = clipboard.readText()
  let clipboardJson

  let clipboardImage = clipboard.readImage()
  let newBoard

  if (clipboardText !== "") {
    clipboardJson = JSON.parse(clipboardText)

    if (clipboardJson.hasOwnProperty('boards')) {
      // multiple boards
      newBoards = clipboardJson.boards
    } else {
      // single board
      newBoard = JSON.parse(JSON.stringify(clipboardJson))
      if (!newBoard.hasOwnProperty('imageDataURL')) {
        console.warn('no image available from clipboard JSON data')
        return
      }
      newBoards = [newBoard]
    }
  }

  // for a clipboard with image only, no board data, create a new board data object
  if (!newBoards && !newBoard && (clipboardImage !== "")) {
    newBoard = {
      newShot: false,
      lastEdited: Date.now(),
      imageDataURL: clipboardImage.toDataURL()
    }
    newBoards = [newBoard]
  }

  // save the image we're currently on
  saveImageFile()

  newBoards.forEach(newBoard => {
    if (newBoard && newBoard.imageDataURL) {
      let newBoardPos = currentBoard + 1

      // assign a new uid to the board, regardless of source
      let uid = util.uidGen(5)
      newBoard.uid = uid
      newBoard.url = 'board-' + newBoardPos + '-' + uid + '.png'

      // set some basic data for the new board
      newBoard.newShot = false
      newBoard.lastEdited = Date.now()

      // extract the image data from JSON
      let newImageSrc = newBoard.imageDataURL
      delete newBoard.imageDataURL

      // insert the new board data
      boardData.boards.splice(newBoardPos, 0, newBoard)
      markBoardFileDirty()

      // go to new board
      gotoBoard(newBoardPos)

      // draw pasted contents to board
      var image = new Image()
      image.src = newImageSrc
    
      // render
      mainCanvas.getContext("2d").drawImage(image, 0, 0)
      markImageFileDirty()
      saveImageFile()
      renderThumbnailDrawer()
      
      // refresh
      gotoBoard(currentBoard)
    }
  })
  storeUndoStateForScene()
}

let moveSelectedBoards = (position) => {
  console.log('moveSelectedBoards(' + position + ')')
  storeUndoStateForScene(true)

  let numRemoved = selections.size
  let firstSelection = [...selections].sort(util.compareNumbers)[0]

  let movedBoards = boardData.boards.splice(firstSelection, numRemoved)

  // if moving forward in the list
  // account for position change due to removed elements
  if (position > firstSelection) {
    position = position - numRemoved
  }
  
  console.log('move starting at board', firstSelection, 
              ', moving', numRemoved, 
              'boards to index', position)

  boardData.boards.splice(position, 0, ...movedBoards)

  // how far from the start of the selection was the current board?
  let offset = currentBoard - firstSelection

  // what are the new bounds of our selection?
  let b = Math.min(position + movedBoards.length - 1, boardData.boards.length - 1)
  let a = b - (selections.size - 1)
  // update selection
  selections = new Set(util.range(a, b))
  // update currentBoard
  currentBoard = a + offset

  markBoardFileDirty()
  storeUndoStateForScene()
}

let reorderBoardsLeft = () => {
  let selectionsAsArray = [...selections].sort(util.compareNumbers)
  let leftMost = selectionsAsArray[0]
  let position = leftMost - 1
  if (position >= 0) {
    saveImageFile()
    moveSelectedBoards(position)
    renderThumbnailDrawer()
    gotoBoard(currentBoard, true)
  }
}

let reorderBoardsRight = () => {
  let selectionsAsArray = [...selections].sort(util.compareNumbers)
  let rightMost = selectionsAsArray.slice(-1)[0] + 1
  let position = rightMost + 1
  if (position <= boardData.boards.length) {
    saveImageFile()
    moveSelectedBoards(position)
    renderThumbnailDrawer()
    gotoBoard(currentBoard, true)
  }
}

let enableEditMode = () => {
  if (!isEditMode && selections.size) {
    isEditMode = true
    thumbnailCursor.visible = true
    renderThumbnailCursor()
    renderThumbnailDrawerSelections()
    contextMenu.remove()
  }
}

let disableEditMode = () => {
  if (isEditMode) {
    isEditMode = false
    thumbnailCursor.visible = false
    renderThumbnailCursor()
    renderThumbnailDrawerSelections()
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

  // HACK account for left sidebar by measuring thumbnail-container
  let thumbnailContainer = document.getElementById('thumbnail-container')
  let sidebarOffsetX = -thumbnailContainer.getBoundingClientRect().left

  let gapWidth = Math.floor(20 * boardData.aspectRatio)

  if (x + sidebarOffsetX <= gapWidth) {
    // have we scrolled all the way to the left already?
    let containerScrollLeft = thumbnailContainer.scrollLeft
    if (containerScrollLeft == 0) {
      return true
    }
  }
  return false
}

let updateThumbnailCursor = (x, y) => {
  if (isBeforeFirstThumbnail(x, y)) {
    thumbnailCursor.x = 0
    thumbnailCursor.el = null
    return
  }

  let el = thumbnailFromPoint(x, y)
  if (el) thumbnailCursor.el = el // only update if found
  if (!el) return
  
  // store a reference to the nearest thumbnail
  thumbnailCursor.el = el

  // HACK account for left sidebar by measuring thumbnail-container
  let sidebarOffsetX = -el.offsetParent.offsetParent.getBoundingClientRect().left

  // HACK two levels deep of offset scrollLeft
  let scrollOffsetX = el.offsetParent.scrollLeft +
                      el.offsetParent.offsetParent.scrollLeft

  let elementOffsetX = el.getBoundingClientRect().right
  
  // is this an end shot?
  if (el.classList.contains('endShot')) {
    elementOffsetX += 5
  }

  let arrowOffsetX = -8
  
  thumbnailCursor.x = sidebarOffsetX +
                      scrollOffsetX +
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

const setupRandomizedNotifications = () => {  
  let defaultMessages = util.shuffle(NotificationData.messages)

  fetch('https://wonderunit.com/software/storyboarder/messages.json').then(response => {
    if (response.ok) {
      response.json().then(json => {
        runRandomizedNotifications(util.shuffle(json.messages))
      }).catch(e => {
        console.warn('Could not parse messages')
        runRandomizedNotifications(defaultMessages)
      })
    } else {
      console.warn('Could not read messages')
      runRandomizedNotifications(defaultMessages)
    }
  }).catch(e => {
    console.warn('Could not load messages')
    console.warn(e)
    runRandomizedNotifications(defaultMessages)
  })
}
const runRandomizedNotifications = (messages) => {
  let count = 0, duration = 60 * 60 * 1000, timeout
  const tick = () => {
    // only fire notification if enabled in preferences
    if (remote.getGlobal('sharedObj').prefs['enableAspirationalMessages']) {
      notifications.notify(messages[count++ % messages.length])
    }
    timeout = setTimeout(tick, duration)
  }
  tick()
}

const getSceneNumberBySceneId = (sceneId) => {
  if (!scriptData) return null
  let orderedScenes = scriptData.filter(data => data.type == 'scene')
  return orderedScenes.findIndex(scene => scene.scene_id == sceneId)
}

// returns the scene object (if available) or null
const getSceneObjectByIndex = (index) =>
  scriptData && scriptData.find(data => data.type == 'scene' && data.scene_number == index + 1)

const storeUndoStateForScene = (isBefore) => {
  let scene = getSceneObjectByIndex(currentScene) 
  // sceneId is allowed to be null (for a single storyboard with no script)
  let sceneId = scene && scene.scene_id
  undoStack.addSceneData(isBefore, { sceneId : sceneId, boardData: util.stringifyClone(boardData) })
}
const applyUndoStateForScene = (state) => {
  if (state.type != 'scene') return // only `scene`s for now

  let currSceneObj = getSceneObjectByIndex(currentScene)
  if (currSceneObj && currSceneObj.scene_id != state.sceneId) {
    // go to that scene
    saveBoardFile()
    currentScene = getSceneNumberBySceneId(state.sceneId)
    loadScene(currentScene)
    renderScript()
  }
  boardData = state.sceneData
  updateBoardUI()
}

const storeUndoStateForImage = (isBefore) => {
  let scene = getSceneObjectByIndex(currentScene)
  let sceneId = scene && scene.scene_id

  // backup to an offscreen canvas
  // TODO memory management. dispose unused canvases.
  let layerId = storyboarderSketchPane.sketchPane.getCurrentLayerIndex()
  let imageBitmap = storyboarderSketchPane.getSnapshotAsCanvas(layerId)

  undoStack.addImageData(isBefore, { sceneId, imageId: currentBoard, layerId, imageBitmap })
}

const applyUndoStateForImage = (state) => {
  // if required, go to the scene first
  let currSceneObj = getSceneObjectByIndex(currentScene)
  if (currSceneObj && currSceneObj.scene_id != state.sceneId) {
    saveImageFile()
    // go to the requested scene
    currentScene = getSceneNumberBySceneId(state.sceneId)
    loadScene(currentScene)
    renderScript()
  }

  // if required, go to the board first
  saveImageFile()
  let step = (currentBoard != state.imageId) ? gotoBoard : () => Promise.resolve()

  step(state.imageId).then(() => {
    let layerContext = storyboarderSketchPane.sketchPane.getLayerCanvas(state.layerId).getContext('2d')

    // draw imageBitmap into it
    layerContext.globalAlpha = 1
    layerContext.clearRect(0, 0, layerContext.canvas.width, layerContext.canvas.height)
    layerContext.drawImage(state.imageBitmap, 0, 0)
  }).catch(e => console.error(e))
}

ipcRenderer.on('setTool', (e, arg)=> {
  if (!toolbar) return

  if (!textInputMode && !storyboarderSketchPane.getIsDrawing()) {
    console.log('setTool', arg)
    switch(arg) {
      case 'lightPencil':
        toolbar.setState({ brush: 'light-pencil' })
        break
      case 'pencil':
        toolbar.setState({ brush: 'pencil' })
        break
      case 'pen':
        toolbar.setState({ brush: 'pen' })
        break
      case 'brush':
        toolbar.setState({ brush: 'brush' })
        break
      case 'notePen':
        toolbar.setState({ brush: 'note-pen' })
        break
      case 'eraser':
        toolbar.setState({ brush: 'eraser' })
        break
    }
  }
})

ipcRenderer.on('useColor', (e, arg)=> {
  if (!toolbar) return

  if (!textInputMode) {
    if (toolbar.getCurrentPalette()) {
      toolbar.emit('current-set-color', toolbar.getCurrentPalette()[arg-1])
    }
  }
})


ipcRenderer.on('clear', (e, arg)=> {
  if (!textInputMode) {
    storyboarderSketchPane.clearLayer()
    sfx.playEffect('trash')
  }
})

ipcRenderer.on('brushSize', (e, direction) => {
  if (!textInputMode) {
    if (direction > 0) {
      toolbar.changeBrushSize(1)
    } else {
      toolbar.changeBrushSize(-1)
    }
  }
})

ipcRenderer.on('flipBoard', (e, arg)=> {
  if (!textInputMode) {
    storyboarderSketchPane.flipLayers()
  }
})

ipcRenderer.on('deleteBoards', (event, args)=>{
  if (!textInputMode) {
    deleteBoards(args)
  }
})

ipcRenderer.on('duplicateBoard', (event, args)=>{
  if (!textInputMode) {
    duplicateBoard()
  }
})

ipcRenderer.on('reorderBoardsLeft', (event, args)=>{
  if (!textInputMode) {
    reorderBoardsLeft()
  }
})

ipcRenderer.on('reorderBoardsRight', (event, args)=>{
  if (!textInputMode) {
    reorderBoardsRight()
  }
})

ipcRenderer.on('cycleViewMode', (event, args)=>{
  if (!textInputMode) {
    cycleViewMode()
  }
})

ipcRenderer.on('toggleCaptions', (event, args)=>{
  if (!textInputMode) {
    toggleCaptions()
  }
})

ipcRenderer.on('textInputMode', (event, args)=>{
  textInputMode = args
  textInputAllowAdvance = false
})

ipcRenderer.on('importImage', (event, args)=> {
  importImage(args)
})
