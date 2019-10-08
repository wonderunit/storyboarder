const path = require('path')

const express = require('express')
const electron = require('electron')
const electronApp = electron.app ? electron.app : electron.remote.app

const app = express()
const http = require('http').Server(app)

const log = require('electron-log')

const portNumber = 1234

const { getSerializedState, updateServer, updateSceneFromXR } = require('../shared/reducers/shot-generator')
const getIpAddress = require('../utils/getIpAddress')

class XRServer {
  constructor ({ store, service }) {
    app.use(express.json({
      limit: '5mb'
    }))

    app.use('/', express.static(
      path.join(__dirname, 'dist')
    ))

    app.use('/data/system', express.static(
      path.join(__dirname, '..', '..', 'data', 'shot-generator')
    ))

    app.use('/data/user', express.static(
      path.join(path.dirname(store.getState().meta.storyboarderFilePath), 'models')
    ))

    app.use('/data/snd', express.static(
      path.join(__dirname, 'public', 'snd')
    ))

    app.use('/data/presets/poses', express.static(
      path.join(electronApp.getPath('userData'), 'presets', 'poses')
    ))

    app.get('/', function(req, res) {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'))
    })

    app.get('/sg.json', (req, res) => {
      const state = store.getState()
      const { aspectRatio } = state

      res.json({
        aspectRatio
      })
    })

    app.get('/presets/poses.json', (req, res) => {
      const { presets } = store.getState()
      res.json(presets.poses)
    })

    app.get('/boards.json', async (req, res) => {
      let boards = await service.getBoards()
      res.json(boards)
    })

    app.get('/boards/:uid.json', async (req, res, next) => {
      let { uid } = req.params
      let board = await service.getBoard(uid)
      if (board) {
        res.json(board)
      } else {
        next()
      }
    })

    app.get('/state.json', (req, res) => {
      const state = store.getState()
      res.json(
        getSerializedState(state)
      )
    })

    app.post('/state.json', (req, res) => {
      let payload = req.body
      store.dispatch(updateSceneFromXR(payload))
      res.status(200).send({ ok: true })
    })

    app.use(function (req, res, next) {
      res.status(404).send('Not found')
    })

    http.on('error', err => {
      console.error(err)
      log.error(err)
    })

    http.listen(portNumber, function() {
      let desc = `XRServer running at`

      let ip = getIpAddress()

      if (ip) {
        log.info(`${desc} http://${ip}:${portNumber}`)

        // there are two servers:
        // createServer creates one on :8000/8001 which is the old default remote input server
        // XRServer creates one on :1234 for XR/VR
        store.dispatch(updateServer({ xrUri: `http://${ip}:${portNumber}` }))
      } else {
        log.error('Could not determine IP address')
      }
    })
  }
}

module.exports = XRServer
