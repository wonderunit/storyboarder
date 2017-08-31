const {ipcRenderer, shell, remote, nativeImage, clipboard} = require('electron')
const { app } = require('electron').remote
const child_process = require('child_process')
const fs = require('fs')
const os = require('os')
const dns = require('dns')
const path = require('path')
const menu = require('../menu.js')
const util = require('../utils/index.js')
const Color = require('color-js')

const StoryboarderSketchPane = require('./storyboarder-sketch-pane.js')
const undoStack = require('../undo-stack.js')

const Toolbar = require('./toolbar.js')
const tooltips = require('./tooltips.js')
const ContextMenu = require('./context-menu.js')
const ColorPicker = require('./color-picker.js')
const PomodoroTimerView = require('./pomodoro-timer-view.js')
const Transport = require('./transport.js')
const notifications = require('./notifications.js')
const NotificationData = require('../../data/messages.json')
const Guides = require('./guides.js')
const OnionSkin = require('./onion-skin.js')
const Sonifier = require('./sonifier/index.js')
const LayersEditor = require('./layers-editor.js')
const sfx = require('../wonderunit-sound.js')
const keytracker = require('../utils/keytracker.js')
const storyTips = new(require('./story-tips'))(sfx, notifications)
const exporter = require('./exporter.js')
const exporterCommon = require('../exporters/common')
const prefsModule = require('electron').remote.require('./prefs.js')

const boardModel = require('../models/board')

const FileHelper = require('../files/file-helper.js')
const readPsd = require('ag-psd').readPsd;
const initializeCanvas = require('ag-psd').initializeCanvas;

const ShotTemplateSystem = require('../shot-template-system')
const StsSidebar = require('./sts-sidebar.js')

const pkg = require('../../../package.json')

const sharedObj = remote.getGlobal('sharedObj')

const {
  LAYER_INDEX_REFERENCE,
  LAYER_INDEX_MAIN,
  LAYER_INDEX_NOTES,
  LAYER_INDEX_COMPOSITE,

  LAYER_NAME_BY_INDEX
} = require('../constants')

const CanvasRecorder = require('../recording/canvas-recorder.js')
const moment = require('moment')
let isRecording = false
let isRecordingStarted = false
let canvasRecorder

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
  [LAYER_INDEX_REFERENCE]:  { dirty: false },
  [LAYER_INDEX_MAIN]:       { dirty: false },
  [LAYER_INDEX_NOTES]:      { dirty: false },

  [LAYER_INDEX_COMPOSITE]:  { dirty: false } // TODO do we need this?
}
let imageFileDirtyTimer

let drawIdleTimer

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
let onionSkin
let layersEditor
let pomodoroTimerView
let shotTemplateSystem

let storyboarderSketchPane

let dragMode = false
let preventDragMode = false
let dragPoint
let dragTarget
let scrollPoint

const msecsToFrames = value => Math.round(value / 1000 * 24)
const framesToMsecs = value => Math.round(value / 24 * 1000)


//  analytics.event('Application', 'open', filename)


menu.setMenu()

///////////////////////////////////////////////////////////////
// Loading / Init Operations
///////////////////////////////////////////////////////////////

const load = (event, args) => {
  if (args[1]) {
    log({ type: 'progress', message: 'Loading Fountain File' })
    console.log("LOADING FOUNTAIN FILE", args[0])
    ipcRenderer.send('analyticsEvent', 'Application', 'open script', args[0])

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
    log({ type: 'progress', message: 'Loading Project File' })
    // if not, its just a simple single boarder file
    boardFilename = args[0]
    boardPath = boardFilename.split(path.sep)
    boardPath.pop()
    boardPath = boardPath.join(path.sep)
    console.log(' BOARD PATH: ', boardFilename)
    boardData = JSON.parse(fs.readFileSync(boardFilename))
    ipcRenderer.send('analyticsEvent', 'Application', 'open', boardFilename, boardData.boards.length)
  }

  loadBoardUI()
  updateBoardUI().then(() => {
    log({ type: 'progress', message: 'Preparing to display' })

    resize()
    setTimeout(() => {
      storyboarderSketchPane.resize()

      setImmediate(() =>
        requestAnimationFrame(() =>
          requestAnimationFrame(() =>
            ipcRenderer.send('workspaceReady')
          )
        )
      )
    }, 500) // TODO hack, remove this #440
  })
}
ipcRenderer.on('load', load)

let toggleNewShot = () => {
  storeUndoStateForScene(true)
  boardData.boards[currentBoard].newShot = !boardData.boards[currentBoard].newShot
  sfx.playEffect(boardData.boards[currentBoard].newShot ? 'on' : 'off')
  document.querySelector('input[name="newShot"]').checked = boardData.boards[currentBoard].newShot
  markBoardFileDirty()
  renderThumbnailDrawer()
  storeUndoStateForScene()
}

const commentOnLineMileage = (miles) => {
  let message = []
  let otherMessages
  switch (miles) {
    // REMOVED TO LIMIT NOTIFICATIONS
    // case 0.01:
    //   otherMessages = [
    //     "Yes!!! The first stroke. I remember my first stroke – fondly.",
    //     "I can tell this one is going to be good!",
    //     "What are you drawing?",
    //     "Let's make this one better than the last one.",
    //     "What's happening in this point of the story?",
    //     "Here we go again!",
    //     "Let's do this!",
    //     "I wish I could draw as good as that.",
    //   ]
    //   message.push(otherMessages[Math.floor(Math.random()*otherMessages.length)])
    //   break
    // case 1: 
    //   otherMessages = [
    //     "Looking great!!!",
    //     "Absolutely fantastic!",
    //     "You're like a regular Picaso.",
    //     "Hey - this looks great. And to think I doubted you.",
    //     "This is way better than your last board!",
    //     "Hooray! A great start.",
    //     "I can see great form in this one.",
    //     "There is so much potential with this drawing!",
    //     "Imagine when your friends see this.",
    //     "Let's keep the line miles to a minimum.",
    //   ]
    //   message.push(otherMessages[Math.floor(Math.random()*otherMessages.length)])
    //   sfx.playEffect('tool-pencil')
    //   break
    case 5: 
      message.push('5 line miles.')
      otherMessages = [
        "You should be done with your rough drawing.",
        "You got the basic form down?",
        "Are you sure this is the layout you want?",
        "Let's get to cleaning this up!",
        "Such great composition!",
        "Oh. Now I can see what you're going for.",
        "Let's wrap this one up.",
        "Beautiful.",
        "You make me proud.",
      ]
      message.push(otherMessages[Math.floor(Math.random()*otherMessages.length)])
      sfx.playEffect('tool-light-pencil')
      break
    case 8: 
      message.push('8 line miles.')
      otherMessages = [
        "Let's finish this up!",
        "Are you done yet?",
        "We have so many other boards to do still...",
        "Yes.. Very close to done.",
        "Can we move on to the next drawing and come back to this one?",
        "I think you need to pee.",
        "Is it finished?",
        "Yeah.. I'm gonna need you to come in this weekend and finish the rest of these boards.",
        "Wrap it up!",
      ]
      message.push(otherMessages[Math.floor(Math.random()*otherMessages.length)])
      sfx.playEffect('tool-brush')
      break
    case 10: 
      message.push('10 miles!')
      otherMessages = [
        "Let's finish this up!",
        "Are you done yet?",
        "Alright, I think this one is done.",
        "Yes.. Very close to done. Actually, looks done to me.",
        "Let's move on.",
        "Remember, you're not making the next Moner Lisa.",
        "Who do you think you are, Picaso?",
        "Looks great! But let's not make it too great.",
        "Sweet!",
      ]
      message.push(otherMessages[Math.floor(Math.random()*otherMessages.length)])
      sfx.positive()
      break
    case 20: 
      message.push('20 miles!!!')
      otherMessages = [
        "This is done. Let's move on.",
        "Woot. You're finished!",
        "You're taking too long.",
        "Come on buddy... put the pen down.",
        "You know you're not burning that many more calories working this hard on this board.",
        "YESSSS!!! BEAUTIFUL!!!!",
        "I LOVE IT!!!!",
        "How did you learn to draw so well?",
      ]
      message.push(otherMessages[Math.floor(Math.random()*otherMessages.length)])
      sfx.negative()
      break
    case 50: 
      message.push('50 miles!!!')
      otherMessages = [
        "Uhh.. I fell asleep. What did I miss?",
        "Are you painting the sixteen chapel or something?",
        "I'm waiting for your paint to dry.",
        "Come on buddy... put the pen down. Let's go for a walk.",
        "Why don't you tweet this masterpiece out?",
        "Hey. This is like some sort of torture.",
        "I thought it looked nice an hour ago.",
        "How about starting a new board?",
      ]
      message.push(otherMessages[Math.floor(Math.random()*otherMessages.length)])
      sfx.negative()
      break
    case 100: 
      message.push('100 miles!!!')
      otherMessages = [
        "Nope!!! I'm going to delete this board if you keep drawing. Just kidding. Or am I?",
        "I FEEL ASLEEP.",
        "Wake me up when you need me.",
        "Dude. You remember you are storyboarding.",
        "Let's go for a walk.",
        "How many boards do we have left?",
        "I thought it looked nice 2 hours ago.",
        "How about starting a new board?",
        "Post this one to twitter, it's a fucking masterpiece.",
      ]
      message.push(otherMessages[Math.floor(Math.random()*otherMessages.length)])
      sfx.error()
      break
    case 200: 
      message.push('200 miles!!!')
      otherMessages = [
        "Now you're just fucking with me.",
        "I FEEL ASLEEP.",
        "You haven't worked your wrist out this hard since you were 13.",
        "I think your pen is going to break.",
      ]
      message.push(otherMessages[Math.floor(Math.random()*otherMessages.length)])
      sfx.error()
      break
    case 300: 
      message.push('300 miles!!!')
      otherMessages = [
        "I quit.",
        "Imagine what I'll say at 1000 miles.",
        "I'm going home.",
        "I hate you.",
      ]
      message.push(otherMessages[Math.floor(Math.random()*otherMessages.length)])
      sfx.error()
      break
    case 500: 
      message.push('500 miles!!!')
      otherMessages = [
        "So close to 1000!!!",
      ]
      message.push(otherMessages[Math.floor(Math.random()*otherMessages.length)])
      sfx.error()
      break
    case 1000: 
      message.push('1000 miles!!!')
      otherMessages = [
        "Great job. :/ See ya.",
      ]
      message.push(otherMessages[Math.floor(Math.random()*otherMessages.length)])
      sfx.error()
      setTimeout(()=> {window.close()}, 5000);
      break
  }
  notifications.notify({message: message.join(' '), timing: 10})
}

let loadBoardUI = ()=> {
  log({ type: 'progress', message: 'Loading User Interface' })

  let aspectRatio = boardData.aspectRatio

  let size
  if (aspectRatio >= 1) {
    size = [900 * aspectRatio, 900]
  } else {
    size = [900, 900 / aspectRatio]
  }

  shotTemplateSystem = new ShotTemplateSystem({ width: size[0], height: size[1] })

  storyboarderSketchPane = new StoryboarderSketchPane(
    document.getElementById('storyboarder-sketch-pane'),
    size
  )
  
  window.addEventListener('resize', () => {
    resize()
    // this is pretty hacky.
    setTimeout(() => storyboarderSketchPane.resize(), 500) // TODO hack, remove this #440
    setTimeout(() => storyboarderSketchPane.resize(), 1000) // TODO hack, remove this #440
    setTimeout(() => storyboarderSketchPane.resize(), 1100) // TODO hack, remove this #440
  })

  window.ondragover = () => { return false }
  window.ondragleave = () => { return false }
  window.ondragend = () => { return false }

  window.ondrop = e => {
    e.preventDefault()
    if(!e || !e.dataTransfer || !e.dataTransfer.files || !e.dataTransfer.files.length) {
      return
    }
    let hasStoryboarderFile = false
    let filepaths = []
    for(let file of e.dataTransfer.files) {
      if(file.name.indexOf(".storyboarder") > -1) {
        hasStoryboarderFile = true
        ipcRenderer.send('openFile', file.path)
        break
      } else {
        filepaths.push(file.path)
      }
    }

    if(!hasStoryboarderFile) {
      insertNewBoardsWithFiles(filepaths)
    }
  }

  storyboarderSketchPane.on('addToUndoStack', layerIndices => {
    storeUndoStateForImage(true, layerIndices)
  })

  storyboarderSketchPane.on('markDirty', layerIndices => {
    storeUndoStateForImage(false, layerIndices)
    markImageFileDirty(layerIndices)

    // save progress image
    if(isRecording) {
      let snapshotCanvases = [
        storyboarderSketchPane.sketchPane.getLayerCanvas(0),
        storyboarderSketchPane.sketchPane.getLayerCanvas(1),
        storyboarderSketchPane.sketchPane.getLayerCanvas(3),
      ]
      canvasRecorder.capture(snapshotCanvases)
      if(!isRecordingStarted) isRecordingStarted = true
    }
  })
  storyboarderSketchPane.on('pointerdown', () => {
    clearTimeout(drawIdleTimer)
  })

  // this is essentially pointerup
  storyboarderSketchPane.on('lineMileage', value => {
    addToLineMileage(value)
    drawIdleTimer = setTimeout(onDrawIdle, 500)
  })



  let sketchPaneEl = document.querySelector('#storyboarder-sketch-pane')

  let captionEl = document.createElement('div')
  captionEl.id = 'canvas-caption'
  sketchPaneEl.appendChild(captionEl)



  for (var item of document.querySelectorAll('#board-metadata input:not(.layers-ui-reference-opacity), textarea')) {
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

    item.addEventListener('input', e => {
      switch (e.target.name) {
        case 'duration':
          document.querySelector('input[name="frames"]').value = msecsToFrames(Number(e.target.value))

          for (let index of selections) {
            boardData.boards[index].duration = Number(e.target.value)
          }
          renderThumbnailDrawer()
          renderMarkerPosition()
          break
        case 'frames':
          document.querySelector('input[name="duration"]').value = framesToMsecs(Number(e.target.value))

          for (let index of selections) {
            boardData.boards[index].duration = framesToMsecs(Number(e.target.value))
          }
          renderThumbnailDrawer()
          renderMarkerPosition()
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
    }
  })

  document.querySelector('.board-metadata-container').addEventListener('pointerdown', (e)=>{
    if (e.pointerType == 'pen' || e.pointerType == 'mouse') {
      dragTarget = document.querySelector('.board-metadata-container')
      dragTarget.style.overflow = 'hidden'
      dragTarget.style.scrollBehavior = 'unset'
      dragMode = true
      dragPoint = [e.pageX, e.pageY]
      scrollPoint = [dragTarget.scrollLeft, dragTarget.scrollTop]
    }
  })


  for (var item of document.querySelectorAll('.board-metadata-container input, .board-metadata-container textarea')) {
    item.addEventListener('pointerdown', (e)=>{
      preventDragMode = true
      dragTarget = document.querySelector('.board-metadata-container')
      dragTarget.style.scrollBehavior = 'smooth'
    })
  }

  
    
    // for (var item of document.querySelectorAll('.thumbnail')) {
    //   item.classList.remove('active')
    // }



  document.querySelector('#show-in-finder-button').addEventListener('pointerdown', (e)=>{
    let board = boardData.boards[currentBoard]
    let imageFilename = path.join(boardPath, 'images', board.url)
    shell.showItemInFolder(imageFilename)
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

    if (dragMode && !preventDragMode) {
      dragTarget.scrollLeft = scrollPoint[0] + (dragPoint[0] - e.pageX)
      dragTarget.scrollTop = scrollPoint[1] + (dragPoint[1] - e.pageY)
    }
  })

  window.addEventListener('pointerup', (e)=>{
    if (dragMode) {
      disableDragMode()
      preventDragMode = false
    }

    mouseDragStartX = null
    clearTimeout(editModeTimer)

    // console.log('pointerup', isEditMode)
    if (isEditMode) {
      let x = e.clientX, y = e.clientY

      // 1) try to find nearest thumbnail, otherwise,
      // HACK 2) try to find last known thumbnail position
      let el = thumbnailFromPoint(x, y) || thumbnailCursor.el
      let offset = 0
      if (el) {
        offset = el.getBoundingClientRect().width
        el = thumbnailFromPoint(x, y, offset/2)
      } 

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

  toolbar.on('brush', (kind, options) => {
    toolbar.emit('cancelTransform')
    storyboarderSketchPane.setBrushTool(kind, options)
    sfx.playEffect('tool-' + kind)
  })
  toolbar.on('brush:size', size => {
    toolbar.emit('cancelTransform')
    storyboarderSketchPane.setBrushSize(size)
  })
  toolbar.on('brush:color', color => {
    toolbar.emit('cancelTransform')
    sfx.playEffect('metal')
    storyboarderSketchPane.setBrushColor(color)
  })


  toolbar.on('trash', () => {
    clearLayers()
  })


  toolbar.on('move', () => {
    if (storyboarderSketchPane.isPointerDown) return
      sfx.playEffect('metal')
    toolbar.setState({ transformMode: 'move' })
    storyboarderSketchPane.moveContents()
  })
  toolbar.on('scale', () => {
    if (storyboarderSketchPane.isPointerDown) return
      sfx.playEffect('metal')
    toolbar.setState({ transformMode: 'scale' })
    storyboarderSketchPane.scaleContents()
  })
  toolbar.on('cancelTransform', () => {
    // FIXME prevent this case from happening
    if (storyboarderSketchPane.isPointerDown) {
      console.warn('pointer is already down')
      return
    }

    toolbar.setState({ transformMode: null })
    storyboarderSketchPane.cancelTransform()
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
    if (undoStack.getCanUndo()) {
      undoStack.undo()
      sfx.rollover()
    } else {
      sfx.error()
      notifications.notify({message: 'Nothing left to undo!', timing: 5})
    }
    sfx.playEffect('metal')
  })
  toolbar.on('redo', () => {
    if (undoStack.getCanRedo()) {
      undoStack.redo()
      sfx.rollover()
    } else {
      sfx.error()
      notifications.notify({message: 'Nothing more to redo!', timing: 5})
    }
    sfx.playEffect('metal')
  })
  
  toolbar.on('grid', value => {
    guides.setState({ grid: value })
    sfx.playEffect('metal')
  })
  toolbar.on('center', value => {
    guides.setState({ center: value })
    sfx.playEffect('metal')
  })
  toolbar.on('thirds', value => {
    guides.setState({ thirds: value })
    sfx.playEffect('metal')
  })
  toolbar.on('perspective', value => {
    guides.setState({ perspective: value })
    sfx.playEffect('metal')
  })
  toolbar.on('onion', value => {
    onionSkin.setEnabled(value)
    if (onionSkin.getEnabled()) {
      if (!onionSkin.isLoaded) {
        onionSkin.load(
          boardData.boards[currentBoard],
          boardData.boards[currentBoard - 1],
          boardData.boards[currentBoard + 1]
        ).catch(err => console.warn(err))
      }
    }
    sfx.playEffect('metal')
  })
  toolbar.on('captions', () => {
    // HACK!!!
    let el = document.querySelector('#canvas-caption')
    el.style.visibility = el.style.visibility == 'hidden'
      ? 'visible'
      : 'hidden'
    sfx.playEffect('metal')
  })
  toolbar.on('open-in-editor', () => {
    openInEditor()
  })

  storyboarderSketchPane.toolbar = toolbar

  if (!toolbar.getState().captions) {
    let el = document.querySelector('#canvas-caption')
    el.style.visibility = 'hidden'
  }

  // HACK force initialize
  sfx.setMute(true)
  toolbar.setState({ brush: 'light-pencil' })
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
    sfx.positive()
    colorPicker.attachTo(document.getElementById('toolbar-current-color'))
    colorPicker.removeAllListeners('color') // HACK

    // initialize color picker active swatch
    colorPicker.setState({ color: color.toCSS() })

    colorPicker.addListener('color', setCurrentColor)
  })
  toolbar.on('palette-color-picker', (color, target, brush, index) => {
    sfx.positive()

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

  guides = new Guides(storyboarderSketchPane.getLayerCanvasByName('guides'), { perspectiveGridFn: shotTemplateSystem.requestGrid })
  onionSkin = new OnionSkin(storyboarderSketchPane, boardPath)
  layersEditor = new LayersEditor(storyboarderSketchPane, sfx, notifications)
  layersEditor.on('opacity', opacity => {
    let layerName = LAYER_NAME_BY_INDEX[opacity.index]
    // if the layer has a data object ...
    if (boardData.boards[currentBoard].layers[layerName]) {
      // ... update the value
      boardData.boards[currentBoard].layers[layerName].opacity = opacity.value
    }
    markBoardFileDirty()
  })
  storyboarderSketchPane.on('pointerdown', () => {
    if (toolbar.state.brush === 'light-pencil' && storyboarderSketchPane.sketchPane.getLayerOpacity() === 0) {
      layersEditor.setReferenceOpacity(exporterCommon.DEFAULT_REFERENCE_LAYER_OPACITY / 100)
    }
  })

  sfx.init()

  const enableDrawingSoundEffects = prefsModule.getPrefs('sound effects')['enableDrawingSoundEffects']
  if(enableDrawingSoundEffects) {
    storyboarderSketchPane.on('pointerdown', Sonifier.start)
    storyboarderSketchPane.on('pointermove', Sonifier.trigger)
    storyboarderSketchPane.sketchPane.on('onup', Sonifier.stop)
    Sonifier.init(storyboarderSketchPane.sketchPane.getCanvasSize())
    window.addEventListener('resize', () => {
      Sonifier.setSize(storyboarderSketchPane.sketchPane.getCanvasSize())
    })
  }

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

  // Pomodoro Timer
  pomodoroTimerView = new PomodoroTimerView()
  toolbar.on('pomodoro-rest', () => {
    sfx.positive()
    pomodoroTimerView.attachTo(document.getElementById('toolbar-pomodoro-rest'))

    pomodoroTimerView.addListener('update', (data)=>{
      toolbar.updatePomodoroTimer(data)

      if(isRecording && data.state === "completed") {
        // make sure we capture the last frame
        notifications.notify({message: "Congratulations! Generating your timelapse! This can take a minute.", timing: 5})

        canvasRecorder.capture([
          storyboarderSketchPane.sketchPane.getLayerCanvas(0),
          storyboarderSketchPane.sketchPane.getLayerCanvas(1),
          storyboarderSketchPane.sketchPane.getLayerCanvas(3)
        ], {force: true})
        setTimeout(()=>{
          canvasRecorder.stop()
        }, 2000)
        isRecording = false
        isRecordingStarted = false
      }
    })

    pomodoroTimerView.addListener('cancel', (data)=>{
      canvasRecorder.cancel()
      isRecording = false
      isRecordingStarted = false
    })

    pomodoroTimerView.addListener('start', (data)=>{
      toolbar.startPomodoroTimer(data)
      let boardSize = storyboarderSketchPane.sketchPane.getCanvasSize()
      let outputWidth = 700
      let targetOutputHeight = (outputWidth/boardSize.width)*boardSize.height

      isRecording = true
      let exportsPath = exporterCommon.ensureExportsPathExists(boardFilename)
      let filename = path.basename(boardFilename, path.extname(boardFilename)) + " timelapse " + moment().format('YYYY-MM-DD hh.mm.ss')
      canvasRecorder = new CanvasRecorder({
        exportsPath: exportsPath,
        filename: filename,
        outputStrategy: "CanvasBufferOutputGifStrategy",
        outputWidth: outputWidth,
        outputHeight: targetOutputHeight,
        recordingStrategy: "RecordingStrategyTimeRatio",
        recordingTime: data.duration
      })

      canvasRecorder.on('recording-ready', (filepaths)=> {
        pomodoroTimerView.newRecordingReady(filepaths)
      })
      canvasRecorder.start()
    })

  })
  toolbar.on('pomodoro-running', () => {
    pomodoroTimerView.attachTo(document.getElementById('toolbar-pomodoro-running'))
  })

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

  window.addEventListener('beforeunload', event => {
    console.log('Close requested! Saving ...')

    // TODO THIS IS SLOW AS HELL. NEED TO FIX PREFS
    toolbar.savePrefs()
    saveImageFile() // NOTE image is saved first, which ensures layers are present in data
    saveBoardFile() // ... then project data can be saved

    // still dirty?
    if (boardFileDirty) {
      // pass the electron-specific flag
      // to trigger `will-prevent-unload` handler in main.js
      event.returnValue = false
    }
  })

  // text input mode on blur, to prevent menu trigger on preferences typing
  window.addEventListener('blur', () => {
    textInputMode = true
  })
  ipcRenderer.on('prefs:change', (event, newPrefs) => {
    if (boardData && boardData.defaultBoardTiming != newPrefs.defaultBoardTiming) {
      boardData.defaultBoardTiming = newPrefs.defaultBoardTiming
      saveBoardFile()
      renderMetaData()
    }
  })

  if (shotTemplateSystem.isEnabled()) {
    StsSidebar.init(shotTemplateSystem, size[0] / size[1])
    StsSidebar.on('select', (img, params, camera) => {
      let board = boardData.boards[currentBoard]

      board.sts = {
        params,
        camera
      }
      markBoardFileDirty()
      guides.setPerspectiveParams({
        cameraParams: board.sts && board.sts.camera,
        rotation: 0
      })

      if (!img) return

      storyboarderSketchPane.replaceLayer(LAYER_INDEX_REFERENCE, img)
      // force a file save and thumbnail update
      saveImageFile()
    })
  } else {
    document.querySelector('#shot-generator-container').remove()
  }



  // for debugging:
  //
  // remote.getCurrentWebContents().openDevTools()
}

let updateBoardUI = () => {
  log({ type: 'progress', message: 'Rendering User Interface' })

  document.querySelector('#canvas-caption').style.display = 'none'
  renderViewMode()

  if (boardData.boards.length == 0) {
    // create a new board
    newBoard(0, false)
  }

  let sequence = Promise.resolve()

  // update sketchpane
  sequence = sequence.then(() => updateSketchPaneBoard())

  // update thumbail drawer
  // update timeline
  sequence = sequence.then(() => renderThumbnailDrawer())

  // update metadata
  sequence = sequence.then(() => gotoBoard(currentBoard))

  return sequence
}

///////////////////////////////////////////////////////////////
// Board Operations
///////////////////////////////////////////////////////////////

let insertNewBoardDataAtPosition = (position) => {
  let uid = util.uidGen(5)

  let board = {
    uid: uid,
    url: `board-${position + 1}-${uid}.png`,
    newShot: false,
    lastEdited: Date.now(),
    layers: {}
  }

  boardData.boards.splice(position, 0, board)

  return board
}

let newBoard = (position, shouldAddToUndoStack = true) => {
  if (shouldAddToUndoStack) {
    saveImageFile() // force-save any current work
    storeUndoStateForScene(true)
    //notifications.notify({message: "Added a new board. Let's make it a great one!", timing: 5})
  }

  if (typeof position == "undefined") position = currentBoard + 1

  // create array entry
  insertNewBoardDataAtPosition(position)

  // indicate dirty for save sweep
  markImageFileDirty([1]) // mark save for 'main' layer only // HACK hardcoded
  markBoardFileDirty() // to save new board data
  renderThumbnailDrawer()
  storeUndoStateForScene()

  // is this not a brand new storyboarder project?
  if (shouldAddToUndoStack) {
    //sfx.bip('c6')
    sfx.down(-2,0)

  }
}

let insertNewBoardsWithFiles = (filepaths) => {
  let count = filepaths.length
  let message = `Importing ${count} image${count !== 1 ? 's':''}.\nPlease wait...`
  notifications.notify({message: message, timing: 2})

  setTimeout(()=> {
    let insertionIndex = currentBoard+1
    let targetLayer = prefsModule.getPrefs('main')['importTargetLayer'] || 'reference'
    let imageFilePromises = filepaths.map(filepath => {
      let readerOptions = {
        importTargetLayer: targetLayer
      }
      let imageData = FileHelper.getBase64ImageDataFromFilePath(filepath)
      if(!imageData) {
        notifications.notify({message: `Oops! There was a problem importing ${filepath}`, timing: 10})
        return new Promise((fulfill)=>fulfill())
      }
      let board = insertNewBoardDataAtPosition(insertionIndex++)
      var image = new Image()
      image.src = imageData[targetLayer]

      return new Promise((fulfill, reject)=>{
        setImmediate(()=>{
          // resize the image if it's too big.
          let boardSize = storyboarderSketchPane.sketchPane.getCanvasSize()
          if(boardSize.width < image.width) {
            let scale = boardSize.width / image.width
            image.width = scale * image.width
            image.height = scale * image.height
          }
          if(boardSize.height < image.height) {
            let scale = boardSize.height / image.height
            image.width = scale * image.width
            image.height = scale * image.height
          }

          // TODO: try pooling
          var canvas = document.createElement('canvas')
          canvas.width = image.width
          canvas.height = image.height
          let context = canvas.getContext('2d')
          context.drawImage(image, 0, 0, image.width, image.height)
          var imageDataSized = canvas.toDataURL()
          let savePath = board.url.replace('.png', '-reference.png')
          if(targetLayer === "main") {
            savePath = board.url
          } else {
            board.layers[targetLayer] = { "url": savePath }
            // save out an empty main layer
            saveDataURLtoFile((document.createElement('canvas')).toDataURL(), board.url)
          }
          saveDataURLtoFile(imageDataSized, savePath)

          // thumbnail
          const thumbnailHeight = 60
          let thumbRatio = thumbnailHeight / boardSize.height
          
          image.width = (image.width / boardSize.width) * (thumbRatio * boardSize.width)
          image.height = image.height / boardSize.height * 60
          canvas.width = thumbRatio * boardSize.width
          canvas.height = thumbnailHeight
          context.drawImage(image, 0, 0, image.width, image.height)
          var imageDataSized = canvas.toDataURL()
          let thumbPath = board.url.replace('.png', '-thumbnail.png')
          saveDataURLtoFile(imageDataSized, thumbPath)

          fulfill()
        })
      })

    })

    Promise.all(imageFilePromises)
      .then(()=>{
        markImageFileDirty([1])
        markBoardFileDirty() // to save new board data
        renderThumbnailDrawer()
        let count = imageFilePromises.length
        let message = `Imported ${count} image${count !== 1 ? 's':''}.\n\nThe image${count !== 1 ? 's are':' is'} on the reference layer, so you can draw over ${count !== 1 ? 'them':'it'}. If you'd like ${count !== 1 ? 'them':'it'} to be the main layer, you can merge ${count !== 1 ? 'them':'it'} up on the sidebar`
        notifications.notify({message: message, timing: 10})
        sfx.positive()
      })
  }, 1000)


}

let markBoardFileDirty = () => {
  boardFileDirty = true
  clearTimeout(boardFileDirtyTimer)
  boardFileDirtyTimer = setTimeout(saveBoardFile, 5000)
}

let saveBoardFile = (opt = { force: false }) => {
  // are we still drawing?
  if (storyboarderSketchPane.getIsDrawingOrStabilizing()) {
    // wait, then retry
    boardFileDirtyTimer = setTimeout(saveBoardFile, 5000)
    return
  }

  if (boardFileDirty) {
    clearTimeout(boardFileDirtyTimer)
    boardData.version = pkg.version
    if (opt.force || prefsModule.getPrefs()['enableAutoSave']) {
      fs.writeFileSync(boardFilename, JSON.stringify(boardData, null, 2))
      boardFileDirty = false
      console.log('saved board file:', boardFilename)
    }
  }
}

let markImageFileDirty = layerIndices => {
  for (let index of layerIndices) {
    layerStatus[index].dirty = true
  }

  clearTimeout(imageFileDirtyTimer)
  imageFileDirtyTimer = setTimeout(saveImageFile, 5000)
}

const addToLineMileage = value => {
  let board = boardData.boards[currentBoard]
  if (!(board.lineMileage)) { 
    board.lineMileage = 0 
  }
  let mileageChecks = [5,8,10,20,50,100,200,300,1000]
  for (let checkAmount of mileageChecks) {
    if ((board.lineMileage/5280 < checkAmount) && ((board.lineMileage + value)/5280 > checkAmount)) {
      commentOnLineMileage(checkAmount)
    }
  }
  board.lineMileage += value
  markBoardFileDirty()
}

const onDrawIdle = () => {
  clearTimeout(drawIdleTimer)

  // update the line mileage in two places
  renderMetaDataLineMileage()
  renderStats()

  // update the thumbnail
  updateThumbnailDisplayFromMemory()
}

let saveDataURLtoFile = (dataURL, filename) => {
  let imageData = dataURL.replace(/^data:image\/\w+;base64,/, '')
  let imageFilePath = path.join(boardPath, 'images', filename)
  fs.writeFileSync(imageFilePath, imageData, 'base64')
}

//
// saveImageFile
//
//  - saves DIRTY layers (including main)
//  - saves CURRENT board
//
// this function saves only the CURRENT board
// call it before changing boards to ensure the current work is saved
//
let saveImageFile = () => {
  // are we still drawing?
  if (storyboarderSketchPane.getIsDrawingOrStabilizing()) {
    // wait, then retry
    imageFileDirtyTimer = setTimeout(saveImageFile, 5000)
    return
  }


  let board = boardData.boards[currentBoard]

  let layersData = [
    [1, 'main', board.url],
    [0, 'reference', board.url.replace('.png', '-reference.png')],
    [3, 'notes', board.url.replace('.png', '-notes.png')]
  ]

  let shouldSaveThumbnail = false
  let shouldSaveBoardFile = false

  let numSaved = 0
  for (let [index, layerName, filename] of layersData) {
    if (layerStatus[index].dirty) {
      shouldSaveThumbnail = true
      clearTimeout(imageFileDirtyTimer)

      let canvas = storyboarderSketchPane.sketchPane.getLayerCanvas(index)
      let imageFilePath = path.join(boardPath, 'images', filename)

      let imageData = canvas
        .toDataURL('image/png')
        .replace(/^data:image\/\w+;base64,/, '')

      try {
        fs.writeFileSync(imageFilePath, imageData, 'base64')

        // add to boardData if it doesn't already exist
        if (index !== LAYER_INDEX_MAIN) {
          board.layers = board.layers || {}

          if (!board.layers[layerName]) {
            board.layers[layerName] = { url: filename }
            console.log('added', layerName, 'to board .layers data')

            shouldSaveBoardFile = true
          }
        }

        layerStatus[index].dirty = false
        numSaved++
        console.log('\tsaved', layerName, 'to', filename)
      } catch (err) {
        console.warn(err)
      }
    }
  }
  
  if (shouldSaveBoardFile) {
    saveBoardFile()
  }

  console.log(`saved ${numSaved} modified layers`)

  // create/update the thumbnail image file if necessary
  let tasks = Promise.resolve()
  if (shouldSaveThumbnail) {
    tasks = saveThumbnailFile(currentBoard).then(index => updateThumbnailDisplayFromFile(index))
  }
  return tasks
}

let openInEditor = () => {
    let imageFilePaths = []
    let psdPromises = []
    for(let selection of selections) {
      psdPromises.push(new Promise((fulfill, reject)=>{
        let board = boardData.boards[selection]
        let pngPaths = []
        if(board.layers.reference && board.layers.reference.url) {
          pngPaths.push({
            "url": path.join(boardPath, 'images', board.layers.reference.url),
            "name": "reference"
          })
        }
        pngPaths.push({
            "url": path.join(boardPath, 'images', board.url),
            "name": "main"
        })
        if(board.layers.notes && board.layers.notes.url) {
          pngPaths.push({
            "url": path.join(boardPath, 'images', board.layers.notes.url),
            "name": "notes"
          })
        }
        
        let psdPath = path.join(boardPath, 'images', board.url.replace('.png', '.psd'))
        
        FileHelper.writePhotoshopFileFromPNGPathLayers(pngPaths, psdPath)
          .then(()=>{
            shell.openItem(psdPath);
            imageFilePaths.push(psdPath)
            board.psd = psdPath
            fulfill()
          })
          .catch(error =>{
            reject(error)
          })
      }))
    }

    Promise.all(psdPromises)
      .then(()=>{
        let updateHandler = (eventType, filename) => {
          let board
          for(let aBoard of boardData.boards) {
            if(aBoard.psd && aBoard.psd.includes(filename)) {
              board = aBoard
              break
            }
          }
          if(!board) {
            return
          }
          let psdData
          let readerOptions = {}
          let curBoard = boardData.boards[currentBoard]
          // Update the current canvas if it's the same board coming back in.
          let isCurrentBoard = false
          if(curBoard.uid === board.uid) {
            readerOptions.referenceCanvas = storyboarderSketchPane.getLayerCanvasByName("reference")
            readerOptions.mainCanvas = storyboarderSketchPane.getLayerCanvasByName("main")
            readerOptions.notesCanvas = storyboarderSketchPane.getLayerCanvasByName("notes")
            storeUndoStateForImage(true, [0, 1, 3])
            isCurrentBoard = true
          }
          
          psdData = FileHelper.getBase64ImageDataFromFilePath(board.psd, readerOptions)
          if(!psdData || !psdData.main) {
            return;
          }

          if(isCurrentBoard) {
            storeUndoStateForImage(false, [0, 1, 3])
            markImageFileDirty([0, 1, 3]) // reference, main, notes layers
            saveImageFile()
            renderThumbnailDrawer()
          } else {
            saveDataURLtoFile(psdData.main, board.url)
            psdData.notes && saveDataURLtoFile(psdData.notes, board.url.replace('.png', '-notes.png'))
            psdData.reference && saveDataURLtoFile(psdData.reference, board.url.replace('.png', '-reference.png'))
          }

          // TODO: set up the correct handler for this.
          setTimeout(()=>{
            saveThumbnailFile(boardData.boards.indexOf(board))
              .then(updateThumbnailDisplayFromFile)
          }, 500)

          // re-watch the file.
          // https://github.com/nodejs/node-v0.x-archive/issues/3640#issuecomment-6806347
          fs.watch(board.psd, updateHandler)
        }

        for(let imageFilePath of imageFilePaths) {
          fs.watch(imageFilePath, updateHandler)
        }
        ipcRenderer.send('analyticsEvent', 'Board', 'edit in photoshop')
      })
      .catch(error =>{
        console.error(error)
      })
    
  }


// // always currentBoard
// const saveProgressFile = () => {
//   let imageFilePath = ''//
//   let size = [x, y]//

//     let context = createBlankContext(size)
//     let canvas = context.canvas//

//     let canvasImageSources = storyboarderSketchPane.getCanvasImageSources()

//   exporterCommon.flattenCanvasImageSourfocesDataToContext(context, canvasImageSources, size)

//   // save

//   // could use  saveDataURLtoFile, which is sync

//   promise.then(() => {
//       let imageData = canvas
//         .toDataURL('image/png')
//         .replace(/^data:image\/\w+;base64,/, '')
    
//       try {
//         fs.writeFile(imageFilePath, imageData, 'base64', () => {
//           resolve()
//           console.log('saved thumbnail', imageFilePath)
//         })
//       } catch (err) {
//         console.error(err)
//         reject(err)
//       }/




// }

const getThumbnailSize = boardData => [Math.floor(60 * boardData.aspectRatio) * 2, 60 * 2 ]

const renderThumbnailToNewCanvas = (index, options = { forceReadFromFiles: false }) => {
  let size = getThumbnailSize(boardData)

  let context = createSizedContext(size)
  fillContext(context, 'white')
  let canvas = context.canvas

  let canvasImageSources
  if (!options.forceReadFromFiles && index == currentBoard) {
    // grab from memory
    canvasImageSources = storyboarderSketchPane.getCanvasImageSources()
    // force reference opacity to default value
    canvasImageSources[LAYER_INDEX_REFERENCE].opacity = exporterCommon.DEFAULT_REFERENCE_LAYER_OPACITY
    // render to context
    exporterCommon.flattenCanvasImageSourcesDataToContext(context, canvasImageSources, size)
    return Promise.resolve(canvas)
  } else {
    // grab from files
    return exporterCommon.flattenBoardToCanvas(
      boardData.boards[index],
      canvas,
      size,
      boardFilename
    )
  }
}

const saveThumbnailFile = (index, options = { forceReadFromFiles: false }) => {
  return new Promise((resolve, reject) => {
    let imageFilePath = path.join(boardPath, 'images', boardModel.boardFilenameForThumbnail(boardData.boards[index]))

    renderThumbnailToNewCanvas(index, options).then(canvas => {
      let imageData = canvas
        .toDataURL('image/png')
        .replace(/^data:image\/\w+;base64,/, '')
    
      try {
        fs.writeFile(imageFilePath, imageData, 'base64', () => {
          console.log('saved thumbnail', imageFilePath)
          resolve(index)
        })
      } catch (err) {
        console.error(err)
        reject(err)
      }
    }).catch(err => {
      console.log(err)
      reject(err)
    })
  })
}

const updateThumbnailDisplayFromFile = index => {
  // load the thumbnail image file
  let el = document.querySelector(`[data-thumbnail="${index}"] img`)
  // does it exist in the thumbnail drawer already?
  if (el) {
    let imageFilePath = path.join(boardPath, 'images', boardModel.boardFilenameForThumbnail(boardData.boards[index]))
    el.src = imageFilePath + '?' + Date.now()
  }
}

const updateThumbnailDisplayFromMemory = () => {
  let index = currentBoard
  return renderThumbnailToNewCanvas(index).then(canvas => {
    let imageData = canvas
      .toDataURL('image/png')

    // find the thumbnail image
    let el = document.querySelector(`[data-thumbnail="${index}"] img`)
    if (el) {
      el.src = imageData
    }
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
  if (boardData.boards.length > 1) {
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
      if (arr.length > 1) {
        notifications.notify({message: "Deleted " + arr.length + " boards.", timing: 5})
      } else {
        notifications.notify({message: "Deleted board.", timing: 5})
      }

    } else {
      // delete a single board
      storeUndoStateForScene(true)
      deleteSingleBoard(currentBoard)
      storeUndoStateForScene()
      notifications.notify({message: "Deleted board", timing: 5})

      // if not requested to move forward
      // we take action to move intentionally backward
      if (!args) {
        currentBoard--
      }
    }
    gotoBoard(currentBoard)
    sfx.playEffect('trash')
    sfx.negative()
  } else {
    sfx.error()
    notifications.notify({message: "Cannot delete. You have to have at least one board, silly.", timing: 8})
  }
}

/**
 * duplicateBoard
 *
 * Duplicates layers and board data, updating board data as required to reflect new uid
 *
 */
let duplicateBoard = () => {
  storeUndoStateForScene(true)
  saveImageFile().then(() => {

    let insertAt = currentBoard + 1

    let boardSrc = boardData.boards[currentBoard]
    let boardDst = migrateBoardData([util.stringifyClone(boardSrc)], insertAt)[0]

    // Per Taino's request, we are not duplicating some metadata
    boardDst.dialogue = ''
    boardDst.action = ''
    boardDst.notes = ''
    boardDst.duration = 0

    //
    //
    // copy files
    //
    try {
      console.log('copying files from index', currentBoard, 'to index', insertAt)
      let filePairs = []
      // main
      filePairs.push({ from: boardSrc.url, to: boardDst.url })
      // reference
      if (boardSrc.layers.reference) {
        filePairs.push({ from: boardSrc.layers.reference.url, to: boardDst.layers.reference.url })
      }
      // notes
      if (boardSrc.layers.notes) {
        filePairs.push({ from: boardSrc.layers.notes.url, to: boardDst.layers.notes.url })
      }
      // thumbnail
      filePairs.push({ from: boardModel.boardFilenameForThumbnail(boardSrc), to: boardModel.boardFilenameForThumbnail(boardDst) })

      // absolute paths
      filePairs = filePairs.map(filePair => Object.assign(filePair, {
        from: path.join(boardPath, 'images', filePair.from),
        to: path.join(boardPath, 'images', filePair.to)
      }))

      for (let { from, to } of filePairs) {
        console.log('copying to', to, 'from', from)
        fs.writeFileSync(to, fs.readFileSync(from))
      }

      // insert data
      boardData.boards.splice(insertAt, 0, boardDst)

      markBoardFileDirty()
      storeUndoStateForScene()

      // boardData.boards has changed, so
      //   reflect spliced board in thumbnail drawer
      renderThumbnailDrawer()

      // go to board
      gotoBoard(insertAt)

      // sfx.bip('c7')
      sfx.down(-1, 2)
      notifications.notify({ message: 'Duplicated board.', timing: 5 })
    } catch (err) {
      console.error(err)
      notifications.notify({ message: 'Error: Could not duplicate board.', timing: 5 })
    }
  })
}

/**
 * clearLayers
 *
 * if we're not on the eraser tool,
 *   and we're either pressing the meta key,
 *     OR being told explicitly to erase the current layer,
 *       we should erase ONLY the current layer
 */
const clearLayers = shouldEraseCurrentLayer => {
  if (toolbar.state.brush !== 'eraser' && (keytracker('<alt>') || shouldEraseCurrentLayer)) {
    storyboarderSketchPane.clearLayers([storyboarderSketchPane.sketchPane.getCurrentLayerIndex()])
    saveImageFile()
    sfx.playEffect('trash')
  } else {
    if (storyboarderSketchPane.isEmpty()) {
      deleteBoards()
    } else {
      storyboarderSketchPane.clearLayers()
      saveImageFile()
      sfx.playEffect('trash')
      notifications.notify({message: 'Cleared canvas.', timing: 5})
    }
  }
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

let animatedScrollingTimer = +new Date()

let gotoBoard = (boardNumber, shouldPreserveSelections = false) => {
  if(isRecording && isRecordingStarted) {
    // make sure we capture the last frame
    canvasRecorder.capture([
      storyboarderSketchPane.sketchPane.getLayerCanvas(0),
      storyboarderSketchPane.sketchPane.getLayerCanvas(1),
      storyboarderSketchPane.sketchPane.getLayerCanvas(3)
    ], {force: true, duration: 500})
  }

  toolbar.emit('cancelTransform')
  return new Promise((resolve, reject) => {
    clearTimeout(drawIdleTimer)

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
        if (((+new Date())-animatedScrollingTimer) > 2000) {
          containerDiv.scrollLeft = thumbDiv.offsetLeft - 300
          animatedScrollingTimer = +new Date()
        }

      }

      if ((thumbDiv.offsetLeft-200) < (containerDiv.scrollLeft)) {
        if (((+new Date())-animatedScrollingTimer) > 2000) {
          containerDiv.scrollLeft = thumbDiv.offsetLeft - containerDiv.offsetWidth + 300
          animatedScrollingTimer = +new Date()
        }
      }


      // console.log()
      // console.log(.scrollLeft)
      // console.log(document.querySelector('#thumbnail-container').offsetWidth)


      //document.querySelector('#thumbnail-container').scrollLeft = (document.querySelector("[data-thumbnail='" + currentBoard + "']").offsetLeft)-200
    } else {
      setTimeout((currentBoard)=>{
        document.querySelector("[data-thumbnail='" + currentBoard + "']").classList.add('active')
      },10,currentBoard)
    }

    renderMetaData()
    renderMarkerPosition()

    let board = boardData.boards[currentBoard]

    if (shotTemplateSystem.isEnabled()) {
      StsSidebar.reset(board.sts)
    }

    guides.setPerspectiveParams({
      cameraParams: board.sts && board.sts.camera,
      rotation: 0
    })

    updateSketchPaneBoard().then(() => resolve()).catch(e => console.error(e))
    ipcRenderer.send('analyticsEvent', 'Board', 'go to board', null, currentBoard)
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

let renderMetaData = () => {
  document.querySelector('#board-metadata #shot').innerHTML = 'Shot: ' + boardData.boards[currentBoard].shot
  document.querySelector('#board-metadata #board-numbers').innerHTML = 'Board: ' + boardData.boards[currentBoard].number + ' of ' + boardData.boards.length

  // reset values
  let editableInputs = document.querySelectorAll('#board-metadata input:not(.layers-ui-reference-opacity), textarea')
  for (var item of editableInputs) {
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
    if (selections.size == 1) {
      // show current board
      for (let input of editableInputs) {
        input.disabled = false
        let label = document.querySelector(`label[for="${input.name}"]`)
        label && label.classList.remove('disabled')
      }

      document.querySelector('input[name="duration"]').value = boardData.boards[currentBoard].duration
      document.querySelector('input[name="frames"]').value = msecsToFrames(boardData.boards[currentBoard].duration)
    } else {
      for (let input of editableInputs) {
        input.disabled = (input.name !== 'duration' && input.name !== 'frames')
        let label = document.querySelector(`label[for="${input.name}"]`)
        label && label.classList.add('disabled')
      }

      let uniqueDurations = util.uniq(boardData.boards.map(b => b.duration))

      if (uniqueDurations.length == 1) {
        // unified
        let duration = uniqueDurations[0]
        document.querySelector('input[name="duration"]').value = duration
        document.querySelector('input[name="frames"]').value = msecsToFrames(duration)
      } else {
        document.querySelector('input[name="duration"]').value = null
        document.querySelector('input[name="frames"]').value = null
      }
    }
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
  renderMetaDataLineMileage()

  // TODO how to regenerate tooltips?
  // if (boardData.defaultBoardTiming) {
  //   document.querySelector('input[name="duration"]').dataset.tooltipDescription = `Enter the number of milliseconds for a board. There are 1000 milliseconds in a second. ${boardData.defaultBoardTiming} milliseconds is the default.`
  // 
  //   let defaultFramesPerBoard = Math.round(boardData.defaultBoardTiming / 1000 * 24)
  //   document.querySelector('input[name="frames"]').dataset.tooltipDescription = `Enter the number of frames for a board. There are 24 frames in a second. ${defaultFramesPerBoard} frames is the default.`
  // }

  renderStats()
}

const renderMetaDataLineMileage = () => {
  let board = boardData.boards[currentBoard]
  if (board.lineMileage){
    document.querySelector('#line-miles').innerHTML = (board.lineMileage/5280).toFixed(1) + ' line miles'
  } else {
    document.querySelector('#line-miles').innerHTML = '0 line miles'
  }
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
  let rightStatsPrimaryEl = document.querySelector('#right-stats .stats-primary')
  rightStatsPrimaryEl.innerHTML = util.truncateMiddle(path.basename(boardFilename, path.extname(boardFilename))) + '.storyboarder'
  rightStatsPrimaryEl.title = path.basename(boardFilename)

  // if (scriptData) {
  //   let numScenes = scriptData.filter(data => data.type == 'scene').length
  
  //   let numBoards = 'N' // TODO sum total number of boards in the script
  
  //   document.querySelector('#right-stats .stats-primary').innerHTML = `${numScenes} SCENES ${numBoards} BOARDS`
  // } else {
  //   let numBoards = boardData.boards.length
  //   document.querySelector('#right-stats .stats-primary').innerHTML = `${numBoards} BOARDS`
  // }
  // document.querySelector('#right-stats .stats-secondary').innerHTML = `AVG BOARDS PER SCENE, TOTAL TIME`


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
  if (scriptData) {
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
  } else {
    if (currentBoard < (boardData.boards.length -1)) {
      currentBoard = (boardData.boards.length -1)
      gotoBoard(currentBoard)
    } else {
      sfx.error()
      notifications.notify({message: "Sorry buddy. I can't go back further.", timing: 5})
    }
  }
}

let previousScene = ()=> {
  if (scriptData) {
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
  } else {
    if (currentBoard > 0) {
      currentBoard = 0
      gotoBoard(currentBoard)
    } else {
      sfx.error()
      notifications.notify({message: "Nope. I can't go any further.", timing: 5})
    }
  }
}

let updateSketchPaneBoard = () => {
  return new Promise((resolve, reject) => {
    // get current board
    let board = boardData.boards[currentBoard]
    

    // always load the main layer
    let layersData = [
      [1, board.url] // HACK hardcoded index
    ]
    // load other layers when available
    if (board.layers) {
      if (board.layers.reference && board.layers.reference.url) {
        layersData.push([0, board.layers.reference.url]) // HACK hardcoded index
      }
      if (board.layers.notes && board.layers.notes.url) {
        layersData.push([3, board.layers.notes.url]) // HACK hardcoded index
      }
    }


    let loaders = []
    for (let [index, filename] of layersData) {
      loaders.push(new Promise((resolve, reject) => {
        let imageFilePath = path.join(boardPath, 'images', filename)
        try {
          if (fs.existsSync(imageFilePath)) {
            let image = new Image()
            image.onload = () => {
              // draw
              resolve([index, image])
            }
            image.onerror = err => {
              // clear
              console.warn(err)
              resolve([index, null])
            }
            image.src = imageFilePath + '?' + Math.random()
          } else {
            // clear
            resolve([index, null])
          }
        } catch (err) {
          // clear
          resolve([index, null])
        }
      }))
    }


    Promise.all(loaders).then(result => {
      const visibleLayerIndexes = [0, 1, 3] // HACK hardcoded

      // key map for easier lookup
      let layersToDrawByIndex = []
      for (let [index, image] of result) {
        if (image) {
          layersToDrawByIndex[index] = image
        }
      }

      // loop through ALL visible layers
      for (let index of visibleLayerIndexes) {
        let image = layersToDrawByIndex[index]

        let context = storyboarderSketchPane.sketchPane.getLayerCanvas(index).getContext('2d')
        context.globalAlpha = 1

        // do we have an image for this particular layer index?
        if (image) {
          // console.log('rendering layer index:', index)
          storyboarderSketchPane.sketchPane.clearLayer(index)
          context.drawImage(image, 0, 0)
        } else {
          // console.log('clearing layer index:', index)
          storyboarderSketchPane.sketchPane.clearLayer(index)
        }
      }

      // load opacity from data, if data exists
      let referenceOpacity =  board.layers && 
                              board.layers[LAYER_NAME_BY_INDEX[LAYER_INDEX_REFERENCE]] && 
                              typeof board.layers[LAYER_NAME_BY_INDEX[LAYER_INDEX_REFERENCE]].opacity !== 'undefined'
        ? board.layers[LAYER_NAME_BY_INDEX[LAYER_INDEX_REFERENCE]].opacity
        : exporterCommon.DEFAULT_REFERENCE_LAYER_OPACITY / 100
      layersEditor.setReferenceOpacity(referenceOpacity)

      onionSkin.reset()
      if (onionSkin.getEnabled()) {
        onionSkin.load(
          boardData.boards[currentBoard],
          boardData.boards[currentBoard - 1],
          boardData.boards[currentBoard + 1]
        ).then(() => resolve()).catch(err => console.warn(err))
      } else {
        resolve()
      }
    }).catch(err => console.warn(err))
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
    let imageFilename = path.join(boardPath, 'images', board.url.replace('.png', '-thumbnail.png'))
    try {
      if (fs.existsSync(imageFilename)) {
        html.push('<div class="top">')
        html.push('<img src="' + imageFilename + '" height="60" width="' + thumbnailWidth + '">')
        html.push('</div>')
      } else {
        // blank image
        html.push('<img src="//:0" height="60" width="' + thumbnailWidth + '">')
      }
    } catch (err) {
      console.error(err)
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
    contextMenu.on('shown', () => {
      sfx.playEffect('metal')
    })
    contextMenu.on('add', () => {
      newBoard()
      gotoBoard(currentBoard+1)
      ipcRenderer.send('analyticsEvent', 'Board', 'new')
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
      ipcRenderer.send('importImagesDialogue')
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
      let eventMouseOut = document.createEvent('MouseEvents')
      eventMouseOut.initMouseEvent('mouseout', true, true)
      el.dispatchEvent(eventMouseOut)
      newBoard(boardData.boards.length)
      gotoBoard(boardData.boards.length)
      ipcRenderer.send('analyticsEvent', 'Board', 'new')
    })

    // NOTE tooltips.setupTooltipForElement checks prefs each time, e.g.:
    // if (sharedObj.prefs['enableTooltips']) { }
    // ... which is slow
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
              html.push('<div class="item" data-action="' + item.text + '"' + durationAsDataAttr + '>' + item.text + '</div>')
              break
            case 'dialogue':
              html.push('<div class="item" data-character="' + item.character + '" data-dialogue="' + item.text + '"' + durationAsDataAttr + '>' + item.character + '<div class="dialogue" style="pointer-events: none">' + item.text + '</div></div>')
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
        dialogue = event.target.dataset.character + ': ' + event.target.dataset.dialogue
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
  if (boardData) {
    saveImageFile()
    saveBoardFile()
  }

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
            directoryName += node.synopsis.substring(0, 50).replace(/\|&;\$%@"<>\(\)\+,/g, '').replace(/\./g, '').replace(/ - /g, ' ').replace(/ /g, '-').replace(/[|&;/:$%@"{}?|<>()+,]/g, '-')
          } else {
            directoryName += node.slugline.substring(0, 50).replace(/\|&;\$%@"<>\(\)\+,/g, '').replace(/\./g, '').replace(/ - /g, ' ').replace(/ /g, '-').replace(/[|&;/:$%@"{}?|<>()+,]/g, '-')
          }
          directoryName += '-' + node.scene_id

          console.log(directoryName)
          // make directory
          fs.mkdirSync(path.join(currentPath, directoryName))
          // make storyboarder file

          let newBoardObject = {
            version: pkg.version,
            aspectRatio: boardSettings.aspectRatio,
            fps: 24,
            defaultBoardTiming: 2000,
            boards: []
          }
          boardFilename = path.join(currentPath, directoryName, directoryName + '.storyboarder')
          boardData = newBoardObject
          fs.writeFileSync(boardFilename, JSON.stringify(newBoardObject, null, 2))
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

  if (onionSkin) {
    onionSkin.setBoardPath(boardPath)
  }

  dragTarget = document.querySelector('#thumbnail-container')
  dragTarget.style.scrollBehavior = 'unset'

  ipcRenderer.send('analyticsEvent', 'Application', 'open', boardFilename, boardData.boards.length)

}

window.onmousedown = (e) => {
  stopPlaying()
}

const resize = () => {
  const toolbarEl = document.getElementById('toolbar')

  // measure the area available to the drawing workspace
  const scenesWidth = document.getElementById('scenes').getBoundingClientRect().width
  const scriptWidth = document.getElementById('script').getBoundingClientRect().width
  const windowWidth = document.body.offsetWidth

  const workspaceWidth = windowWidth - scenesWidth - scriptWidth

  // toolbar buttons start getting smaller right away
  let breakpointToolbar = 1895
  toolbarEl.classList.toggle('with-toolbar-small', workspaceWidth <= breakpointToolbar)

  // when the workspace is constrained, then the brush tools contract as well
  let breakpointWorkspace = 1635
  toolbarEl.classList.toggle('with-workspace-small', workspaceWidth <= breakpointWorkspace)
}

window.onkeydown = (e)=> {
  if (!textInputMode) {
    console.log(e)
    switch (e.keyCode) {
      // C - Copy
      case 67:
        if (e.metaKey || e.ctrlKey) {
          copyBoards()
          e.preventDefault()
        }
        break
      // X - Cut
      case 88:
        if (e.metaKey || e.ctrlKey) {
          copyBoards()
          deleteBoards()
          notifications.notify({message: 'Copied boards to clipboard.', timing: 5})
          e.preventDefault()
        }
        break

      // r
      // case 82:
      //   if(isRecording) {
      //     let snapshotCanvases = [
      //       storyboarderSketchPane.sketchPane.getLayerCanvas(0),
      //       storyboarderSketchPane.sketchPane.getLayerCanvas(1),
      //       storyboarderSketchPane.sketchPane.getLayerCanvas(3)
      //     ]
      //     // make sure we capture the last frame
      //     canvasRecorder.capture(snapshotCanvases, {force: true})
      //     canvasRecorder.stop()
      //     isRecording = false
      //     isRecordingStarted = false
      //   } else {
      //     isRecording = true

      //     let outputStrategy = "CanvasBufferOutputGifStrategy"
      //     if (e.metaKey || e.ctrlKey) {
      //       outputStrategy = "CanvasBufferOutputFileStrategy"
      //     }
      //     let exportsPath = exporterCommon.ensureExportsPathExists(boardFilename)
      //     canvasRecorder = new CanvasRecorder({
      //       exportsPath: exportsPath,
      //       outputStrategy: outputStrategy,
      //       recordingStrategy: "RecordingStrategyFrameRatio", //"RecordingStrategyTimeRatio",
      //       recordingTime: 10,
      //       outputTime: 1,
      //     })
      //     canvasRecorder.start()
      //   }
      // V
      case 86:
        if (e.metaKey || e.ctrlKey) {
          pasteBoards()
          e.preventDefault()
        }
        break
      // Z
      case 90:
       if (e.metaKey || e.ctrlKey) {
          if (e.shiftKey) {
            if (undoStack.getCanRedo()) {
              undoStack.redo()
              sfx.rollover()
            } else {
              sfx.error()
              notifications.notify({message: 'Nothing more to redo!', timing: 5})
            }
          } else {
            if (undoStack.getCanUndo()) {
              undoStack.undo()
              sfx.rollover()
            } else {
              sfx.error()
              notifications.notify({message: 'Nothing left to undo!', timing: 5})
            }
          }
          e.preventDefault()
        }
        break
      // TAB
      case 9:
        cycleViewMode()
        e.preventDefault()
        break;
      // ESCAPE
      case 27:
        if (dragMode && isEditMode && selections.size) {
          disableEditMode()
          disableDragMode()
        }
        break
    }
  }

  if (!textInputMode || textInputAllowAdvance) {

    // console.log(e)

    switch (e.keyCode) {
      // arrow left
      case 37:
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
      // arrow right
      case 39:
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
let speakingMode = false
let utter = new SpeechSynthesisUtterance()

let stopPlaying = () => {
  clearTimeout(frameTimer)

  // prevent unnecessary calls
  if (!playbackMode) return

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

  if (playbackMode && boardData.boards[currentBoard].dialogue && speakingMode) {
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
    frameDuration = boardData.defaultBoardTiming
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
  ipcRenderer.send('analyticsEvent', 'Board', 'new')
})

ipcRenderer.on('openInEditor', (event, args)=>{
  openInEditor()
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

ipcRenderer.on('undo', (e, arg) => {
  if (!textInputMode) {
    if (undoStack.getCanUndo()) {
      undoStack.undo()
      sfx.rollover()
    } else {
      sfx.error()
      notifications.notify({message: 'Nothing more to redo!', timing: 5})
    }
  }
})

ipcRenderer.on('redo', (e, arg) => {
  if (!textInputMode) {
    if (undoStack.getCanRedo()) {
      undoStack.redo()
      sfx.rollover()
    } else {
      sfx.error()
      notifications.notify({message: 'Nothing left to undo!', timing: 5})
    }
  }
})

let importImage = (imageDataURL) => {
  // TODO: undo
  var image = new Image()
  image.addEventListener('load', ()=>{
    console.log(boardData.aspectRatio)
    console.log((image.height/image.width))
    console.log(image)
    let targetWidth
    let targetHeight
    let offsetX
    let offsetY


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
    storyboarderSketchPane
      .getLayerCanvasByName('reference')
      .getContext("2d")
      .drawImage(image, offsetX, offsetY, targetWidth, targetHeight)
    markImageFileDirty([0]) // HACK hardcoded
    saveImageFile()


  }, false);

  image.src = imageDataURL

}

/**
 * Copy
 *
 * Copies to the clipboard, as 'text', a JSON object containing
 * `boards` (an array of board objects), and
 * `layerDataByBoardIndex` with base64 image data inserted, e.g.:
 *
 * {
 *   boards: [
 *     {
 *       url: ...,
 *       layers: { ... }
 *     }
 *   },
 *   layerDataByBoardIndex: [
 *     'data:image/png;base64,...'
 *   ]
 * }
 *
 * For a single board, it will also add a flattened bitmap
 * of all visible layers as an 'image' to the clipboard.
 *
 */
let copyBoards = () => {
  if (textInputMode) return // ignore copy command in text input mode

  if (selections.size > 1) {
    //
    //
    // copy multiple boards
    //
    if (selections.has(currentBoard)) {
      saveImageFile()
    }

    // make a copy of the board data for each selected board
    let selectedBoardIndexes = [...selections].sort(util.compareNumbers)
    let boards = selectedBoardIndexes.map(n => util.stringifyClone(boardData.boards[n]))

    // inject image data for each board
    let layerDataByBoardIndex = boards.map((board, index) => {
      let result = {}
      let filepath = path.join(boardPath, 'images', board.url)
      let data = FileHelper.getBase64TypeFromFilePath('png', filepath)
      if (data) {
        result[LAYER_INDEX_MAIN] = data
      } else {
        console.warn("could not load image for board", board.url)
      }

      if (board.layers) {
        for (let [layerName, sym] of [['reference', LAYER_INDEX_REFERENCE], ['notes', LAYER_INDEX_NOTES]]) { // HACK hardcoded
          if (board.layers[layerName]) {
            let filepath = path.join(boardPath, 'images', board.layers[layerName].url)
            let data = FileHelper.getBase64TypeFromFilePath('png', filepath)
            if (data) {
              result[sym] = data
            } else {
              console.warn("could not load image for board", board.layers[layerName].url)
            }
          }
        }
      }

      return result
    })

    let payload = {
      text: JSON.stringify({ boards, layerDataByBoardIndex }, null, 2)
    }
    clipboard.clear()
    clipboard.write(payload)

  } else {
    //
    //
    // copy one board
    //
    saveImageFile() // ensure we have all layers created in the data and saved to disk

    // copy a single board (the current board)
    // if you have only one board in your selection, we copy the current board
    //
    // assumes that UI only allows a single selection when it is also the current board
    //
    let board = util.stringifyClone(boardData.boards[currentBoard])

    let imageData = {}
    imageData[LAYER_INDEX_MAIN] = storyboarderSketchPane.getLayerCanvasByName('main').toDataURL()

    if (board.layers) {
      for (let [layerName, sym] of [['reference', LAYER_INDEX_REFERENCE], ['notes', LAYER_INDEX_NOTES]]) { // HACK hardcoded
        if (board.layers[layerName]) {
          imageData[sym] = storyboarderSketchPane.getLayerCanvasByName(layerName).toDataURL()
        }
      }
    }

    let { width, height } = storyboarderSketchPane.sketchPane.getCanvasSize()
    let size = [width, height]
    // create transparent canvas, appropriately sized
    let canvas = createSizedContext(size).canvas
    exporterCommon.flattenBoardToCanvas(
      board,
      canvas,
      size,
      boardFilename
    ).then(() => {
      let payload = {
        image: nativeImage.createFromDataURL(canvas.toDataURL()),
        text: JSON.stringify({ boards: [board], layerDataByBoardIndex: [imageData] }, null, 2)
      }
      clipboard.clear()
      clipboard.write(payload)
      notifications.notify({ message: "Copied" })
    }).catch(err => {
      console.log(err)
      notifications.notify({ message: "Error. Couldn't copy." })
    })
  }
}

let exportAnimatedGif = () => {
  // load all the images in the selection
  if (selections.has(currentBoard)) {
    saveImageFile()
  }
  let boards
  if (selections.size == 1) {
    boards = util.stringifyClone(boardData.boards)
  } else {
    boards = [...selections].sort(util.compareNumbers).map(n => util.stringifyClone(boardData.boards[n]))
  }
  let boardSize = storyboarderSketchPane.sketchPane.getCanvasSize()

  notifications.notify({message: "Exporting " + boards.length + " boards. Please wait...", timing: 5})
  sfx.down()
  setTimeout(()=>{
    exporter.exportAnimatedGif(boards, boardSize, 888, boardPath, true, boardData)
  }, 1000)
}

exporter.on('complete', path => {
  notifications.notify({message: "I exported your board selection as a GIF. Share it with your friends! Post it to you twitter thing or your slack dingus.", timing: 20})
  sfx.positive()
  shell.showItemInFolder(path)
})

const exportFcp = () => {
  notifications.notify({message: "Exporting " + boardData.boards.length + " boards to FCP and Premiere. Please wait...", timing: 5})
  sfx.down()
  setTimeout(()=>{
    exporter.exportFcp(boardData, boardFilename).then(outputPath => {
      notifications.notify({message: "Your scene has been exported for Final Cut Pro X and Premiere.", timing: 20})
      sfx.positive()
      shell.showItemInFolder(outputPath)
    })
  }, 1000)
}

const exportImages = () => {
  notifications.notify({message: "Exporting " + boardData.boards.length + " to a folder. Please wait...", timing: 5})
  sfx.down()
  setTimeout(()=>{
    exporter.exportImages(boardData, boardFilename).then(outputPath => {
      notifications.notify({message: "Your scene has been exported as images.", timing: 20})
      sfx.positive()
      shell.showItemInFolder(outputPath)
    })
  }, 1000)
}


const exportPDF = () => {
  notifications.notify({message: "Exporting " + boardData.boards.length + " boards to PDF. Please wait...", timing: 5})
  sfx.down()
  setTimeout(()=>{
    exporter.exportPDF(boardData, boardFilename).then(outputPath => {
      notifications.notify({message: "Your scene has been exported as a PDF.", timing: 20})
      sfx.positive()
      shell.showItemInFolder(outputPath)
    })
  }, 1000)
}

const exportCleanup = () => {
  exporter.exportCleanup(boardData, boardFilename).then(newBoardData => {
    boardData = newBoardData
    notifications.notify({ message: "Your scene has been cleaned up!", timing: 20 })
    sfx.positive()
  }).catch(err => {
    console.log(err)
  })
}

let save = () => {
  saveImageFile()
  saveBoardFile({ force: true })
  sfx.positive()

  if (prefsModule.getPrefs()['enableAutoSave']) {
    notifications.notify({message: "Saving is automatic. I already saved before you pressed this, so you don't really need to save at all. \n\nBut I did want you to know, that I think you're special - and I like you just the way you are.\n\nHere's a story tip..." , timing: 15})
    setTimeout(()=>{storyTips.show()}, 1000)
  } else {
    notifications.notify({ message: "Saved." })
  }
}


/**
 * Paste
 *
 * Creates  a) from `text`, one or more new boards
 *               with board objects from the clipboard JSON
 *               and board layer images from the base64 clipboard JSON
 *          b) from `image`, one new board
 *               with clipboard image data inserted as reference layer
 *
 */
let pasteBoards = () => {
  if (textInputMode) return

  // save the current image to disk
  saveImageFile()

  let newBoards
  let layerDataByBoardIndex

  // do we have JSON data?
  let text = clipboard.readText()
  if (text !== "") {
    try {
      let data = JSON.parse(text)

      newBoards = data.boards
      layerDataByBoardIndex = data.layerDataByBoardIndex

      if (newBoards.length > 1) {
        notifications.notify({ message: "Pasting " + newBoards.length + " boards.", timing: 5 })
      } else {
        notifications.notify({ message: "Pasting a board.", timing: 5 })
      }
    } catch (err) {
      // if there is an error parsing the JSON
      // ignore it, and continue on
      // (it may be a valid single image instead)
      // be sure to clear newBoards
      console.log(err)
      newBoards = null
    }
  }
  // ... otherwise ...
  if (!newBoards) {
    // ... do we have just image data?
    let image = clipboard.readImage()
    if (!image.isEmpty()) {

      // make a blank canvas placeholder for the main image
      let { width, height } = storyboarderSketchPane.sketchPane.getCanvasSize()
      let size = [width, height]
      let blankCanvas = createSizedContext(size).canvas

      // convert clipboard data to board object and layer data
      newBoards = [
        {
          newShot: false,
          url: 'imported.png', // placeholder filename
          layers: {
            reference: {
              url: 'imported-reference.png' // placeholder filename
            }
          }
        }
      ]
      layerDataByBoardIndex = [{
        [LAYER_INDEX_REFERENCE]: image.toDataURL(),
        [LAYER_INDEX_MAIN]: blankCanvas.toDataURL()
      }]

      notifications.notify({ message: "Pasting a sweet image you probably copied from the internet, you dirty dog, you. It's on the reference layer, so feel free to draw over it. You can resize or reposition it." , timing: 10 })
    }
  }

  if (newBoards) {
    let selectionsAsArray = [...selections].sort(util.compareNumbers)
    let insertAt = selectionsAsArray[selectionsAsArray.length - 1] // insert after the right-most current selection

    insertAt = insertAt + 1 // actual splice point

    let boards = migrateBoardData(newBoards, insertAt)

    // insert boards from clipboard data
    Promise.resolve().then(() => {
      // store the "before" state
      storeUndoStateForScene(true)

      return insertBoards(boardData.boards, insertAt, boards, { layerDataByBoardIndex })
    }).then(() => {
      markBoardFileDirty()
      storeUndoStateForScene()

      return renderThumbnailDrawer()
    }).then(() => {
      console.log('paste complete')
      sfx.positive()
      return gotoBoard(insertAt)
    }).catch(err => {
      notifications.notify({ message: "Whoops. Could not paste boards. Got an error for some reason.", timing: 8 })
      console.log(err)
    })

  } else {
    notifications.notify({ message: "There's nothing in the clipboard that I can paste. Are you sure you copied it right?", timing: 8 })
    sfx.error()
  }
}

const insertBoards = (dest, insertAt, boards, { layerDataByBoardIndex }) => {
  // TODO pass `size` as argument instead of relying on storyboarderSketchPane
  let { width, height } = storyboarderSketchPane.sketchPane.getCanvasSize()
  let size = [width, height]

  return new Promise((resolve, reject) => {
    let tasks = Promise.resolve()
    boards.forEach((board, index) => {
      // for each board
      let position = insertAt + index
      let imageData = layerDataByBoardIndex[index]

      // scale layer images and save to files
      if (imageData) {

        if (imageData[LAYER_INDEX_MAIN]) {
          tasks = tasks.then(() =>
            fitImageData(size, imageData[LAYER_INDEX_MAIN]).then(scaledImageData =>
              saveDataURLtoFile(scaledImageData, board.url)))
        }

        if (imageData[LAYER_INDEX_REFERENCE]) {
          tasks = tasks.then(() =>
            fitImageData(size, imageData[LAYER_INDEX_REFERENCE]).then(scaledImageData =>
              saveDataURLtoFile(scaledImageData, board.layers.reference.url)))
        }

        if (imageData[LAYER_INDEX_NOTES]) {
          tasks = tasks.then(() =>
            fitImageData(size, imageData[LAYER_INDEX_NOTES]).then(scaledImageData =>
              saveDataURLtoFile(scaledImageData, board.layers.notes.url)))
        }
      }

      tasks = tasks.then(() => {
        // add to the data
        dest.splice(position, 0, board)

        // update the thumbnail
        return saveThumbnailFile(position, { forceReadFromFiles: true })
      })
    })

    tasks.then(() => {
      resolve()
    }).catch(err => {
      console.log(err)
      reject()
    })
  })
}

// via https://stackoverflow.com/questions/6565703/math-algorithm-fit-image-to-screen-retain-aspect-ratio
//
// Image data: (wi, hi) and define ri = wi / hi
// Screen resolution: (ws, hs) and define rs = ws / hs
//
// rs > ri ? (wi * hs/hi, hs) : (ws, hi * ws/wi)
//
// top = (hs - hnew)/2
// left = (ws - wnew)/2

const fitToDst = (dst, src) => {
  let wi = src.width
  let hi = src.height
  let ri = wi / hi

  let ws = dst.width
  let hs = dst.height
  let rs = ws / hs

  let [wnew, hnew] = rs > ri ? [wi * hs/hi, hs] : [ws, hi * ws/wi]

  let x = (ws - wnew)/2
  let y = (hs - hnew)/2

  return [x, y, wnew, hnew]
}

const fitImageData = (boardSize, imageData) => {
  return new Promise((resolve, reject) => {
    exporterCommon.getImage(imageData).then(image => {
      // if ratio matches,
      // don't bother drawing,
      // just return original image data
      if (
        image.width  == boardSize[0] &&
        image.height == boardSize[1]
      ) {
        resolve(imageData)
      } else {
        let context = createSizedContext(boardSize)
        let canvas = context.canvas
        context.drawImage(image, ...fitToDst(canvas, image).map(Math.round))
        resolve(canvas.toDataURL())
      }
    }).catch(err => {
      console.log(err)
      reject(err)
    })
  })
}


const importFromWorksheet = (imageArray) => {
  let insertAt = 0 // pos
  let boards = []

  for (var i = 0; i < imageArray.length; i++) {
    let board = {}
    let uid = util.uidGen(5)
    board.uid = uid
    board.url = 'board-' + (insertAt+i) + '-' + board.uid + '.png'
    board.layers = {reference: {url: board.url.replace('.png', '-reference.png')}}
    board.newShot = false
    board.lastEdited = Date.now()

    boards.push(board)
  }

  let blankCanvas = document.createElement('canvas').toDataURL()

  let layerDataByBoardIndex = []
  for (var i = 0; i < imageArray.length; i++) {
    let board = {}
    board[0] = imageArray[i]
    board[1] = blankCanvas
    layerDataByBoardIndex.push(board)
  }

  // insert boards from worksheet data
  Promise.resolve().then(() => {
    // store the "before" state
    storeUndoStateForScene(true)

    // save the current layers to disk
    saveImageFile()

    return insertBoards(boardData.boards, insertAt, boards, { layerDataByBoardIndex })
  }).then(() => {
    markBoardFileDirty()
    storeUndoStateForScene()
    return renderThumbnailDrawer()
  }).then(() => {
    sfx.positive()
    notifications.notify({ message: 'Worksheet Import complete.', timing: 5 })
    return gotoBoard(insertAt)
  }).catch(err => {
    notifications.notify({ message: "Whoops. Could not import.", timing: 8 })
    console.log(err)
  })
}



const migrateBoardData = (newBoards, insertAt) => {
  // assign a new uid to the board, regardless of source
  newBoards = newBoards.map(boardModel.assignUid)

  // set some basic data for the new board
  newBoards = newBoards.map(boardModel.setup)

  // update board layers filenames based on index
  newBoards = newBoards.map((board, index) =>
    boardModel.updateUrlsFromIndex(board, index))

  return newBoards
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
    sfx.playEffect('on')
    notifications.notify({message: 'Reordered to the left!', timing: 5})
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
    sfx.playEffect('metal')
    notifications.notify({message: 'Reordered to the right!', timing: 5})
  }
}

let enableEditMode = () => {
  if (!isEditMode && selections.size) {
    isEditMode = true
    thumbnailCursor.visible = true
    renderThumbnailCursor()
    renderThumbnailDrawerSelections()
    contextMenu.remove()
    sfx.positive()
    sfx.playEffect('on')

  }
}

let disableEditMode = () => {
  if (isEditMode) {
    sfx.playEffect('metal')
    sfx.negative()
    isEditMode = false
    thumbnailCursor.visible = false
    renderThumbnailCursor()
    renderThumbnailDrawerSelections()
    notifications.notify({message: 'Reordered!', timing: 5})
  }
}

let thumbnailFromPoint = (x, y, offset) => {
  if (!offset) { offset = 0 }
  let el = document.elementFromPoint(x-offset, y)

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
  let offset = 0
  if (el) {
    offset = el.getBoundingClientRect().width
    el = thumbnailFromPoint(x, y, offset/2)
  } 

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

const welcomeMessage = () => {
  let message = []
  let otherMessages
  let hour = new Date().getHours()
  if (hour < 12) {
    message.push('Good morning!')
    otherMessages = [
      "It's time for a healthy breakfast!",
      "It's beautiful out today – At least where I am.",
      "You look great today.",
      "",
      ""
    ]
    message.push(otherMessages[Math.floor(Math.random()*otherMessages.length)])
  } else if (hour > 12 && hour <= 17) {
    message.push('Good afternoon!')
    otherMessages = [
      "If you do a great job, I'll let you have an afternoon snack! Don't tell your mom.",
      "",
      "Almost quittin' time AMIRITE?",
      "I'm still hungry. You?",
      "Should we take a walk later?",
    ]
    message.push(otherMessages[Math.floor(Math.random()*otherMessages.length)])
  } else if (hour > 17) {
    message.push('Good evening!')
    otherMessages = [
      "When it gets dark out is when I do my best work.",
      "Hey. I was just about to leave.",
      "",
    ]
    message.push(otherMessages[Math.floor(Math.random()*otherMessages.length)])
  } else if (hour == 12) {
    message.push('Lunch time!')
    otherMessages = [
      "Wait, you're working at lunchtime? Your boss sounds like a real dick.",
      "Did you even eat yet?",
      "Yeah! Let's work together!",
    ]
    message.push(otherMessages[Math.floor(Math.random()*otherMessages.length)])
  }
  otherMessages = [
    "It's time to board!",
    "Let's tell some great stories!",
    "I love storyboarding! Let's make something great together!",
    "If you like Storyboarder, maybe like tell your friends on Twitter.",
  ]
  message.push(otherMessages[Math.floor(Math.random()*otherMessages.length)])
  otherMessages = [
    "Here's a quote I totally did not just download from the internet:",
    "I think you're the best.",
    "If you have ideas for Storyboarder, let us know! We'd love to hear from you.",
    "",
  ]
  message.push(otherMessages[Math.floor(Math.random()*otherMessages.length)])
  notifications.notify({message: message.join(' '), timing: 10})
} 

const setupRandomizedNotifications = () => {  
  let defaultMessages = util.shuffle(NotificationData.messages)
  //setTimeout(()=>{welcomeMessage()}, 1000)
  setTimeout(()=>{runRandomizedNotifications(defaultMessages)}, 3000)
}

const runRandomizedNotifications = (messages) => {
  let count = 0, duration = 60 * 60 * 1000, timeout
  const tick = () => {
    // only fire notification if enabled in preferences
    if (prefsModule.getPrefs('aspirational')['enableAspirationalMessages']) {
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

// TODO memory management. dispose unused canvases
const storeUndoStateForImage = (isBefore, layerIndices = null) => {
  let scene = getSceneObjectByIndex(currentScene)
  let sceneId = scene && scene.scene_id

  if (!layerIndices) layerIndices = [storyboarderSketchPane.sketchPane.getCurrentLayerIndex()]

  let layers = layerIndices.map(index => {
    // backup to an offscreen canvas
    let source = storyboarderSketchPane.getSnapshotAsCanvas(index)
    return {
      index,
      source
    }
  })

  undoStack.addImageData(isBefore, {
    type: 'image',
    sceneId,
    boardIndex: currentBoard,
    layers
  })
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

  let sequence = Promise.resolve()

  // wait until save completes
  sequence = sequence.then(() => saveImageFile())

  // if required, go to the board first
  if (currentBoard != state.boardIndex) {
    sequence = sequence.then(() => gotoBoard(state.boardIndex))
  }

  sequence = sequence.then(() => {
    for (let layerData of state.layers) {
      // get the context of the undo-able layer
      let context = storyboarderSketchPane.sketchPane.getLayerCanvas(layerData.index).getContext('2d')

      // draw saved canvas onto layer
      context.save()
      context.globalAlpha = 1
      context.clearRect(0, 0, context.canvas.width, context.canvas.height)
      context.drawImage(layerData.source, 0, 0)
      context.restore()

      markImageFileDirty([layerData.index])
    }

  })
  .then(() => saveThumbnailFile(state.boardIndex))
  .then(index => updateThumbnailDisplayFromFile(index))
  .then(() => toolbar.emit('cancelTransform'))
  .catch(e => console.error(e))
}

const createSizedContext = size => {
  let canvas = document.createElement('canvas')
  let context = canvas.getContext('2d')
  canvas.width = size[0]
  canvas.height = size[1]
  return context
}

const fillContext = (context, fillStyle = 'white') => {
  context.fillStyle = fillStyle
  context.fillRect(0, 0, context.canvas.width, context.canvas.height)
}

ipcRenderer.on('setTool', (e, arg)=> {
  if (!toolbar) return

  if (!textInputMode && !storyboarderSketchPane.getIsDrawingOrStabilizing()) {
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


ipcRenderer.on('clear', (e, arg) => {
  if (!textInputMode) {
    clearLayers(arg)
    ipcRenderer.send('analyticsEvent', 'Board', 'clear')
  }
})

ipcRenderer.on('brushSize', (e, direction) => {
  if (!textInputMode) {
    if (direction > 0) {
      toolbar.changeBrushSize(1)
      sfx.playEffect('brush-size-up')
    } else {
      toolbar.changeBrushSize(-1)
      sfx.playEffect('brush-size-down')
    }
  }
})
// HACK to support changing eraser size during quick erase
window.addEventListener('keydown', e => {
  // when alt key is held down during Quick Erase mode,
  // menu won't trigger the '[' and ']' accelerators
  // so we need to detect the combination
  // and call changeBrushSize ourselves
  const changeEraserSizeDuringQuickErase = direction => {
    // remember the actual brush we're on
    let prior = toolbar.state.brush
    // switch to eraser long enough to change the brush size
    toolbar.state.brush = 'eraser'
    // change the brush size, which will re-render the cursor
    toolbar.changeBrushSize(direction)
    // re-render the toolbar to reflect prior brush
    toolbar.state.brush = prior
    toolbar.render()
  }
  if (toolbar.getIsQuickErasing()) {
    if (e.altKey) {
      if (e.code === 'BracketRight') {
        changeEraserSizeDuringQuickErase(1)
        sfx.playEffect('brush-size-up')
      } else if (e.code === 'BracketLeft') {
        changeEraserSizeDuringQuickErase(-1)
        sfx.playEffect('brush-size-down')
      }
    }
  }
})


ipcRenderer.on('flipBoard', (e, arg)=> {
  if (!textInputMode) {
    storyboarderSketchPane.flipLayers(arg)
    sfx.playEffect('metal')
    notifications.notify({message: 'I flipped the board.', timing: 5})
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
    ipcRenderer.send('analyticsEvent', 'Board', 'duplicate')
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

ipcRenderer.on('insertNewBoardsWithFiles', (event, filepaths)=> {
  insertNewBoardsWithFiles(filepaths)
})

ipcRenderer.on('importImage', (event, args)=> {
  //console.log(args)
  importImage(args)
})

ipcRenderer.on('toggleGuide', (event, args) => {
  if (!textInputMode) {
    toolbar.setState({ [args]: !toolbar.state[args] })
    toolbar.emit(args, toolbar.state[args])
  }
})

ipcRenderer.on('toggleNewShot', (event, args) => {
  if (!textInputMode) {
    toggleNewShot()
  }
})

ipcRenderer.on('toggleSpeaking', (event, args) => {
  speakingMode = !speakingMode
})

ipcRenderer.on('showTip', (event, args) => {
  storyTips.show()
  ipcRenderer.send('analyticsEvent', 'Board', 'showTip')
})

ipcRenderer.on('exportAnimatedGif', (event, args) => {
  exportAnimatedGif()
  ipcRenderer.send('analyticsEvent', 'Board', 'exportAnimatedGif')
})

ipcRenderer.on('exportFcp', (event, args) => {
  exportFcp()
  ipcRenderer.send('analyticsEvent', 'Board', 'exportFcp')
})

ipcRenderer.on('exportImages', (event, args) => {
  exportImages()
  ipcRenderer.send('analyticsEvent', 'Board', 'exportImages')
})

ipcRenderer.on('exportPDF', (event, args) => {
  exportPDF()
  ipcRenderer.send('analyticsEvent', 'Board', 'exportPDF')
})

ipcRenderer.on('exportCleanup', (event, args) => {
  exportCleanup()
  ipcRenderer.send('analyticsEvent', 'Board', 'exportCleanup')
})

let printWindow
let importWindow

ipcRenderer.on('exportWorksheetPdf', (event, sourcePath) => {
  let outputPath = path.join(
    exporterCommon.ensureExportsPathExists(boardFilename),
    'Worksheet ' + moment().format('YYYY-MM-DD hh.mm.ss') + '.pdf'
  )
  
  if (!fs.existsSync(outputPath)) {
    fs.writeFileSync(outputPath, fs.readFileSync(sourcePath))
  
    notifications.notify({ message: "A Worksheet PDF has been exported.", timing: 20 })
    sfx.positive()
    shell.showItemInFolder(outputPath)
  
  } else {
    console.error('File exists')
    sfx.error()
    notifications.notify({ message: "Could not export Worksheet PDF.", timing: 20 })
  }
})
ipcRenderer.on('printWorksheet', (event, args) => {
  console.log(boardData)

  if (!printWindow) {
    printWindow = new remote.BrowserWindow({
      width: 1200, 
      height: 800, 
      minWidth: 600, 
      minHeight: 600, 
      backgroundColor: '#333333',
      show: false, 
      center: true, 
      parent: remote.getCurrentWindow(), 
      resizable: true, 
      frame: false, 
      modal: true
    })
    printWindow.loadURL(`file://${__dirname}/../../print-window.html`)
  } else {
    if (!printWindow.isVisible()) {
      printWindow.show()
      printWindow.webContents.send('worksheetData',boardData.aspectRatio, currentScene, scriptData)
    }
  }

  printWindow.once('ready-to-show', () => {
    printWindow.show()
    printWindow.webContents.send('worksheetData',boardData.aspectRatio, currentScene, scriptData)
  })
  ipcRenderer.send('analyticsEvent', 'Board', 'show print window')
})

ipcRenderer.on('importFromWorksheet', (event, args) => {
  importFromWorksheet(args)
})

ipcRenderer.on('importNotification', (event, args) => {
  let hostname = os.hostname()
  let that = this
  dns.lookup(hostname, function (err, add, fam) {
    let message =  "Did you know that you can import directly from your phone?\n\nOn your mobile phone, go to the web browser and type in: \n\n" + add + ":1888"
    notifications.notify({message: message, timing: 60})
  })
})

ipcRenderer.on('importWorksheets', (event, args) => {
  if (!importWindow) {
    importWindow = new remote.BrowserWindow({
      width: 1200, 
      height: 800, 
      minWidth: 600, 
      minHeight: 600, 
      backgroundColor: '#333333',
      show: false, 
      center: true, 
      parent: remote.getCurrentWindow(), 
      resizable: true, 
      frame: false, 
      modal: true
    })
    importWindow.loadURL(`file://${__dirname}/../../import-window.html`)
  } else {
    if (!importWindow.isVisible()) {
      importWindow.webContents.send('worksheetImage',args)
    }
  }

  importWindow.once('ready-to-show', () => {
    importWindow.webContents.send('worksheetImage',args)
  })
  ipcRenderer.send('analyticsEvent', 'Board', 'show import window')
})

ipcRenderer.on('save', (event, args) => {
  save()
  ipcRenderer.send('analyticsEvent', 'Board', 'save')
})

const log = opt => ipcRenderer.send('log', opt)
