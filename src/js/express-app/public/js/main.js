/* 

TODO:

On reconnect ask for current image
listen for image
send stroke data
ui design
blocking if there is no connection

*/

var socket = io.connect('/', { reconnectionDelay: 200, reconnectionDelayMax: 500 })

socket.on('connect_error', function (data) {
  console.log("connect error - are you sure Storyboarder is running on your computer?")
  console.log(data)
})

socket.on('reconnect', function (data) {
  console.log("reconnected!!!")
  console.log(data)
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

function setEnabled (el, value) {
  if (value) {
    el.style.opacity = 1.0
    el.querySelector('input').removeAttribute('disabled')
  } else {
    el.style.opacity = 0.5
    el.querySelector('input').setAttribute('disabled', true)
  }
}

function onBoardFile (e) {
  let file = e.target.files[0]
  doUploadFile(file, 'image')
}

function onWorksheetFile (e) {
  let file = e.target.files[0]
  doUploadFile(file, 'worksheet')
}

function doUploadFile (file, target = 'image') {
  let container = target === 'image'
    ? document.querySelector('.file-board-container')
    : document.querySelector('.file-worksheet-container')

  setEnabled(container, false)

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
      setTimeout(() => reset(container), 1000)
    })
    .catch(err => {
      console.error(err)
      alert(err)
      reset(container)
    })
}

function reset (container) {
  setEnabled(container, true)
  container.querySelector('input').value = null
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
