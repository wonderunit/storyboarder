const fs = require('fs-extra')
const moment = require('moment')
const path = require('path')
const remote = require('electron').remote
const request = require('request-promise-native')

const exporterWeb = require('./js/exporters/web')
const archiver = require('archiver')

const { getInitialStateRenderer } = require('electron-redux')
const configureStore = require('./js/shared/store/configureStore')

const prefsModule = remote.require('./prefs')
const store = configureStore(getInitialStateRenderer(), 'renderer')

// const API_URI = 'http://localhost:8080/api'
const API_URI = 'https://storyboarders.com/api'

const onSubmit = async event => {
  event.preventDefault()

  event.target.querySelector('button').disabled = true
  event.target.querySelector('button').innerHTML = 'Signing In …'

  let url = `${API_URI}/login`

  let formData = {
    email: event.target.querySelector('[name=email]').value,
    password: event.target.querySelector('[name=password]').value
  }

  try {
    let res = await request.post({ url, formData, resolveWithFullResponse: true })

    let json = JSON.parse(res.body)

    prefsModule.set('auth', {
      token: json.token
    })

    render()
  } catch (err) {
    window.alert(err.message)

    event.target.querySelector('button').disabled = false
    event.target.querySelector('button').innerHTML = 'Sign In'
  }
}

const onUpload = async event => {
  event.preventDefault()

  document.querySelector('.upload-window__button').innerHTML = 'Uploading …'
  document.querySelector('.upload-window__button').disabled = true

  document.querySelector('.upload-window__output').innerHTML = 'Please be patient. Uploading to the interweb might take a while!'

  let sceneFilePath = store.getState().sceneFilePath
  let sceneDirPath = path.dirname(sceneFilePath)

  let basename = path.basename(sceneFilePath, path.extname(sceneFilePath))
  let timestamp = moment().format('YYYY-MM-DD hh.mm.ss')
  let outputFolderPath = path.join(sceneDirPath, 'exports', `${basename}-web-${timestamp}`)
  let zipFilePath = path.join(path.dirname(outputFolderPath), `${path.basename(outputFolderPath)}.zip`)

  try {
    await exporterWeb.exportForWeb(sceneFilePath, outputFolderPath)

    let writer = new Promise((resolve, reject) => {
      let output = fs.createWriteStream(zipFilePath)
      let archive = archiver('zip', {
        zlib: { level: 9 } // compression level
      })
      // listen for all archive data to be written
      output.on('close', function () {
        resolve()
      })
      // good practice to catch warnings (ie stat failures and other non-blocking errors)
      archive.on('warning', function (err) {
        if (err.code === 'ENOENT') {
          // throw error
          reject(err)
        } else {
          // throw error
          reject(err)
        }
      })
      // good practice to catch this error explicitly
      archive.on('error', function (err) {
        reject(err)
      })
      // pipe archive data to the file
      archive.pipe(output)

      // append files from a directory, putting its contents at the root of archive
      archive.directory(outputFolderPath, false)

      // finalize the archive (ie we are done appending files but streams have to finish yet)
      archive.finalize()
    })

    await writer

    // remote.shell.showItemInFolder(outputFolderPath)

    let url = `${API_URI}/upload`

    let scene = JSON.parse(fs.readFileSync(sceneFilePath))

    let formData = {
      title: path.basename(sceneFilePath, path.extname(sceneFilePath)),
      // description: TODO populate from form

      // TODO use audio duration
      duration: scene.boards[scene.boards.length - 1].time +
                scene.boards[scene.boards.length - 1].duration,
      boards: scene.boards.length,
      width: Math.round(scene.aspectRatio * 720), // 1721,
      height: 720,
      // zip: fs.createReadStream(zipFilePath)
    }

    let token = prefsModule.getPrefs().auth.token

    let res = await request
      .post({ url, formData, resolveWithFullResponse: true })
      .auth(null, null, true, token)

    let json = JSON.parse(res.body)

    console.log('Upload OK')
    console.log('message:', json.message, 'id:', json.id)

    prefsModule.set('auth', {
      token: json.renewedToken
    })

    document.querySelector('.upload-window__output').innerHTML = 'Done!'
    window.alert('Done!')
    render()
    setTimeout(() => remote.getCurrentWindow().hide(), 100)
  } catch (err) {
    console.error(err)
    document.querySelector('.upload-window__output').innerHTML = 'Oops! A server error occurred. Sorry!'
    window.alert('Could not upload\n' + err.message)
    render()
  }
}

const render = () => {
  // remove any existing form
  let div = document.body.querySelector('div')
  if (div) {
    div.parentNode.removeChild(div)
  }

  let prefs = prefsModule.getPrefs()

  if (prefs.auth) {
    let t = document.querySelector('#upload-form')
    let clone = document.importNode(t.content, true)
    clone.querySelector('form').addEventListener('submit', onUpload)

    document.body.appendChild(clone)
  } else {
    let t = document.querySelector('#signin-form')
    let clone = document.importNode(t.content, true)
    clone.querySelector('a[rel="external"]').addEventListener('click', event => {
      event.preventDefault()
      remote.shell.openExternal(event.target.href)
    })

    clone.querySelector('form').addEventListener('submit', onSubmit)
    document.body.appendChild(clone)
  }
}

const init = () => {
  prefsModule.init(path.join(remote.app.getPath('userData'), 'pref.json'))

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      event.preventDefault()
      remote.getCurrentWindow().hide()
    }
  })

  let win = remote.getCurrentWindow()
  win.webContents.on('before-input-event', (event, input) => {
    // if we are focused on an input
    if (document.activeElement && document.activeElement.tagName === 'INPUT') {
      // only enable application menu keyboard shortcuts when Ctrl / Cmd are down.
      win.webContents.setIgnoreMenuShortcuts(!input.control && !input.meta)
    }
  })

  render()
}

init()
