const path = require('path')

const express = require('express')
const electron = require('electron')
const electronApp = electron.app ? electron.app : electron.remote.app

const isDev = require('electron-is-dev')

const app = express()
const http = require('http').Server(app)

const log = require('electron-log')

const portNumber = 1234

const { getSerializedState, updateServer, updateSceneFromXR, getHash } = require('../shared/reducers/shot-generator')
const getIpAddress = require('../utils/getIpAddress')

class XRServer {
  constructor ({ store, service }) {
    const validSameBoard = uid => store.getState().board.uid === uid

    app.use(express.json({
      limit: '5mb'
    }))

    // Enable CORS for testing in development
    if (isDev) {
      app.use((req, res, next) => {
        res.header('Access-Control-Allow-Origin', '*')
        res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept')
        res.header('Access-Control-Allow-Methods', 'GET, PUT, POST, DELETE')

        // intercept OPTIONS method
        if (req.method == 'OPTIONS') {
          res.sendStatus(200)
        } else {
          next()
        }
      })
    }

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

    app.use('/boards/images', express.static(
      path.join(path.dirname(store.getState().meta.storyboarderFilePath), 'images')
    ))

    app.get('/', function(req, res) {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'))
    })

    app.get('/sg.json', (req, res) => {
      const state = store.getState()
      const { aspectRatio, meta: { lastSavedHash } } = state

      let hash = getHash(state)

      res.json({
        aspectRatio,

        // data in-memory
        hash,
        // data when last saved
        lastSavedHash
      })
    })
    /*
    To test changing the current board:

        npm start test/fixtures/example/example.storyboarder

        curl -X POST \
          -H "Content-Type: application/json" \
          -d '{"uid":"RRO6K"}' \
          http://localhost:1234/sg.json

    */
    app.post('/sg.json', async (req, res) => {
      let { uid } = req.body
      if (uid) {
        let boards = await service.getBoards()
        if (boards.find(board => board.uid === uid)) {
          // trigger Shot Generator to update its board
          // TODO could wait for SG update to succeed before updating VR?
          await service.loadBoardByUid(uid)
          // get the board data
          let board = await service.getBoard(uid)
          // send it to VR
          res.json(board)
          return
        }
      }

      res.status(500).send('Error')
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

    app.get('/state.json', async (req, res) => {
      const state = store.getState()
      // const { board } = await service.getStoryboarderState()
      const { board } = state
      const serializedState = getSerializedState(state)
      // send only what XR needs to know
      let { uid, shot, dialogue, action, notes } = board
      res.json({
        board: {
          uid, shot, dialogue, action, notes
        },
        state: serializedState
      })
    })

    app.post('/state.json', (req, res) => {
      let { uid } = req.query
      let sg = req.body
      if (!validSameBoard(uid)) {
        res.status(500).send('The board you are attempting to update from VR is not open in Shot Generator')
      } else {
        store.dispatch(updateSceneFromXR(sg))
        res.status(200).send({ ok: true })
      }
    })

    // upload data to Shot Generator AND save to the current board
    app.post('/boards/:uid.json', async (req, res, next) => {
      let { uid } = req.params
      let sg = req.body
      if (!validSameBoard(uid)) {
        res.status(500).send('The board you are attempting to save from VR is not open in Shot Generator')
      } else {
        store.dispatch(updateSceneFromXR(sg))
        service.saveShot()
        res.status(200).send({ ok: true })
      }
    })
    // upload data to Shot Generator AND insert as a NEW board
    app.post('/boards.json', async (req, res, next) => {
      let sg = req.body
      store.dispatch(updateSceneFromXR(sg))
      let { board } = await service.insertShot()
      res.json(board)
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
