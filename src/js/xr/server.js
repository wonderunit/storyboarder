const path = require('path')

const express = require('express')
const electron = require('electron')
const electronApp = electron.app ? electron.app : electron.remote.app

const isDev = require('electron-is-dev')

const log = require('electron-log')

const app = express()

const https = require('https')
const io = require('socket.io')
const {serve} = require('./sockets')

const fs = require('fs-extra')
const forge = require('node-forge')

const Peer = require('peerjs').default


class XRServer {
  constructor ({ store, service, staticPath = window.__dirname }) {
    const projectPath = path.dirname(store.getState().meta.storyboarderFilePath)
    const userDataPath = electronApp.getPath('userData')

    serve(store, service, staticPath, projectPath, userDataPath)   
  }
}

module.exports = XRServer
