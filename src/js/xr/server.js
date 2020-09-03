const path = require('path')

const electron = require('electron')
const electronApp = electron.app ? electron.app : electron.remote.app

const {updateServer} = require('../shared/reducers/shot-generator')

const {serve} = require('./sockets')


class XRServer {
  constructor ({ store, service, staticPath = window.__dirname }) {
    const projectPath = path.dirname(store.getState().meta.storyboarderFilePath)
    const userDataPath = electronApp.getPath('userData')

    serve(store, service, staticPath, projectPath, userDataPath)
    .then(({host, port, id}) => [
      store.dispatch(updateServer({ xrUri: `https://${host}:${port}/${id}` }))
    ])
  }
}

module.exports = XRServer
