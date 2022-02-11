const { ipcRenderer } = require('electron')
const remote = require('@electron/remote')
const request = require('request-promise-native')

const exporterWeb = require('./js/exporters/web')

const init = () => {
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

  document.body.appendChild(createFormElement())
}

const createFormElement = () => {
  let t = document.querySelector('#signin-form')
  let clone = document.importNode(t.content, true)

  clone.querySelector('a[rel="external"]').addEventListener('click', event => {
    event.preventDefault()
    remote.shell.openExternal(event.target.href)
  })

  clone.querySelector('form').addEventListener('submit', onSubmit)
  return clone
}

const onSubmit = async event => {
  event.preventDefault()

  event.target.querySelector('button').disabled = true
  event.target.querySelector('button').innerHTML = 'Signing In …'

  let url = `${exporterWeb.API_URI}/login`

  let formData = {
    email: event.target.querySelector('[name=email]').value,
    password: event.target.querySelector('[name=password]').value
  }

  try {
    let res = await request.post({ url, formData, resolveWithFullResponse: true })

    let json = JSON.parse(res.body)

    if (!json.token) {
      throw new Error('No token')
    }

    ipcRenderer.send('signInSuccess', json)
    remote.getCurrentWindow().hide()
  } catch (err) {
    if (err.statusCode === 403) {
      window.alert('That email/password combination was not accepted.')
    } else {
      window.alert('Whoops! An error occurred.\n' + err.message)
    }

    event.target.querySelector('button').disabled = false
    event.target.querySelector('button').innerHTML = 'Sign In'
  }
}

init()
