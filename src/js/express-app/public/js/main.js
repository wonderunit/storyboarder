/* 

TODO:

On reconnect ask for current image
listen for image
send stroke data
ui design
blocking if there is no connection
if reconnected, should already know if window is open or not (via appServer)
when disconnected, disable UI

*/

let model = {
  connected: false,
  canImport: false,

  isImportingImage: false,
  isImportingWorksheet: false,

  present (data) {
    if (typeof data.connected !== 'undefined') model.connected = data.connected
    if (typeof data.canImport !== 'undefined') model.canImport = data.canImport

    if (typeof data.isImportingImage !== 'undefined') model.isImportingImage = data.isImportingImage
    if (typeof data.isImportingWorksheet !== 'undefined') model.isImportingWorksheet = data.isImportingWorksheet

    state.render(model)
  }
}

let state = {
  representation (model) {
    let representation = model
    view.display(representation)
  },
  render (model) {
    state.representation(model)
    // state.nextAction(model)
  }
}

let view = {
  init (model) {
    return model
  },
  display (representation) {
    const setEnabled = (el, value) => {
      if (value) {
        el.style.opacity = 1.0
        el.querySelector('input').removeAttribute('disabled')

        // NOTE existing file input is ALWAYS cleared when value is true (e.g.: after any disconnection)
        el.querySelector('input').value = null
      } else {
        el.style.opacity = 0.5
        el.querySelector('input').setAttribute('disabled', true)
      }
    }

    let imageContainer = document.querySelector('.file-board-container')
    let worksheetContainer = document.querySelector('.file-worksheet-container')

    if (representation.connected && representation.canImport) {
      setEnabled(imageContainer, !representation.isImportingImage)
      setEnabled(worksheetContainer, !representation.isImportingWorksheet)
    } else {
      setEnabled(imageContainer, false)
      setEnabled(worksheetContainer, false)
    }

    let message = ''
    if (representation.connected) {
      if (!representation.canImport) {
        message = 'Please open a project in Storyboarder before importing.'
      }
    } else {
      message = 'Please open the Storyboarder app.'
    }

    document.querySelector('.message').innerHTML = message
  }
}

let actions = {
  setCanImport (canImport) {
    model.present({ canImport })
  },
  setConnected (connected) {
    model.present({ connected })
  },
  setIsImporting (key, value) {
    model.present({ [key]: value })
  }
}

var socket = io.connect('/', { reconnectionDelay: 200, reconnectionDelayMax: 500, rejectUnauthorized: false })

socket.on('connect', () => actions.setConnected(true))
socket.on('disconnect', () => actions.setConnected(true))

socket.on('connect_error', function (error) {
  console.log("connect error - are you sure Storyboarder is running on your computer?")
  // console.log(error)
  actions.setConnected(false)
})

socket.on('reconnect', function (data) {
  console.log("reconnected!!!")
  console.log(data)
  actions.setConnected(true)
})

socket.on('canImport', (data) => {
  actions.setCanImport(data)
})

document.body.onpointermove = (e) => {
  socket.emit('pointerEvent', { my: e.clientX, pressure: e.pressure })
}

// document.addEventListener("click", function (e) {
//   window.document.body.webkitRequestFullscreen()
//   window.screen.orientation.lock("landscape")
// }, false)




document.querySelector("#file-board").addEventListener('change', onBoardFile)
document.querySelector("#file-worksheet").addEventListener('change', onWorksheetFile)

function onBoardFile (e) {
  let file = e.target.files[0]
  doUploadFile(file, 'image')
}

function onWorksheetFile (e) {
  let file = e.target.files[0]
  doUploadFile(file, 'worksheet')
}

function doUploadFile (file, target = 'image') {
  let key = target === 'image'
    ? 'isImportingImage'
    : 'isImportingWorksheet'

  actions.setIsImporting(key, true)

  checkFile(file)
    .then(file => readFile(file))
    .then((result, type) => processFile(result, type))
    .then(fileData => {
      if (target === 'worksheet') {
        socket.emit('worksheet', { fileData })
      } else {
        socket.emit('image', { fileData })
      }
    })
    .then(() => {
      // NOTE we don't actually get notified when the import completes
      //      we just hardcode a 1s timer as an approximation ¯\_(ツ)_/¯
      setTimeout(() => actions.setIsImporting(key, false), 1000)
    })
    .catch(err => {
      console.error(err)
      alert(err)
      actions.setIsImporting(key, false)
    })
}

function checkFile (file) {
  return new Promise((resolve, reject) => {
    if (file) {
      if (/^image\//i.test(file.type)) {
        resolve(file)
      } else {
        reject(new Error('Not a valid image!'))
      }
    }
  })
}

function readFile (file) {
  return new Promise((resolve, reject) => {
    var reader = new FileReader()

    reader.onloadend = function () {
      resolve(reader.result, file.type)
    }

    reader.onerror = function () {
      reject(new Error('There was an error reading the file!'))
    }

    reader.readAsDataURL(file)
  })
}

function processFile (dataURL, fileType) {
  return new Promise((resolve, reject) => {
    var image = new Image()
    image.src = dataURL

    image.onload = function () {
      resolve(dataURL)
    }

    image.onerror = function () {
      reject(new Error('There was an error processing your file!'))
    }
  })
}

// initialize view
view.display(view.init(model))
