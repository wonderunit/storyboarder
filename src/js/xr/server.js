const path = require('path')

const express = require('express')
const electron = require('electron')
const electronApp = electron.app ? electron.app : electron.remote.app

const isDev = require('electron-is-dev')

const log = require('electron-log')

const app = express()

//const http = require('http').Server(app)
const https = require('https')
const io = require('socket.io')//(https, { wsEngine: 'ws', serveClient: false })
const {serve} = require('./sockets')

const fs = require('fs-extra')
const forge = require('node-forge')
// via https://github.com/parcel-bundler/parcel/blob/8e80016d8b61c5d68759bfd1caa9fb827e46643c/packages/core/utils/src/generateCertificate.js
function generateCertificate (host) {
  let certDirectory = electronApp.getPath('userData')

  let privateKeyPath = path.join(certDirectory, 'key.pem')
  let certPath = path.join(certDirectory, 'cert.pem')

  const cachedKey = fs.existsSync(privateKeyPath) && fs.readFileSync(privateKeyPath)
  const cachedCert = fs.existsSync(certPath) && fs.readFileSync(certPath)

  if (cachedKey && cachedCert) {
    log.info('Using existing key.pem and cert.pem from', certDirectory)
    return {
      key: cachedKey,
      cert: cachedCert
    }
  }

  log.info('Generating SSL Certificate …')

  const pki = forge.pki
  const keys = pki.rsa.generateKeyPair(2048)
  const cert = pki.createCertificate()

  cert.publicKey = keys.publicKey
  cert.serialNumber = Date.now().toString()
  cert.validity.notBefore = new Date()
  cert.validity.notAfter = new Date()
  cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 1)

  const attrs = [
    {
      name: 'commonName',
      value: 'wonderunit.com',
    },
    {
      name: 'countryName',
      value: 'US',
    },
    {
      shortName: 'ST',
      value: 'New York',
    },
    {
      name: 'localityName',
      value: 'New York',
    },
    {
      name: 'organizationName',
      value: 'wonderunit',
    },
    {
      shortName: 'OU',
      value: 'Test',
    },
  ]

  let altNames = [
    {
      type: 2, // DNS
      value: 'localhost',
    },
    {
      type: 7, // IP
      ip: '127.0.0.1',
    },
  ]

  if (host) {
    altNames.push({
      type: 2, // DNS
      value: host,
    })
  }

  cert.setSubject(attrs)
  cert.setIssuer(attrs)
  cert.setExtensions([
    {
      name: 'basicConstraints',
      cA: false,
    },
    {
      name: 'keyUsage',
      keyCertSign: true,
      digitalSignature: true,
      nonRepudiation: true,
      keyEncipherment: true,
      dataEncipherment: true,
    },
    {
      name: 'extKeyUsage',
      serverAuth: true,
      clientAuth: true,
      codeSigning: true,
      emailProtection: true,
      timeStamping: true,
    },
    {
      name: 'nsCertType',
      client: true,
      server: true,
      email: true,
      objsign: true,
      sslCA: true,
      emailCA: true,
      objCA: true,
    },
    {
      name: 'subjectAltName',
      altNames,
    },
    {
      name: 'subjectKeyIdentifier',
    },
  ])

  cert.sign(keys.privateKey, forge.md.sha256.create())

  const privPem = pki.privateKeyToPem(keys.privateKey)
  const certPem = pki.certificateToPem(cert)

  fs.writeFileSync(privateKeyPath, privPem)
  fs.writeFileSync(certPath, certPem)

  return {
    key: privPem,
    cert: certPem
  }
}

const PORT = 1234

const { getSerializedState, updateServer, updateSceneFromXR, getHash } = require('../shared/reducers/shot-generator')
const getIpAddress = require('../utils/getIpAddress')

class XRServer {
  constructor ({ store, service, staticPath = window.__dirname }) {
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
        if (req.method === 'OPTIONS') {
          res.sendStatus(200)
        } else {
          next()
        }
      })
    }

    app.use('/', express.static(
      path.join(staticPath, 'js/xr/dist')
    ))

    app.use('/data/system', express.static(
      path.join(staticPath, 'data', 'shot-generator')
    ))

    app.use('/data/user', express.static(
      path.join(path.dirname(store.getState().meta.storyboarderFilePath), 'models')
    ))

    app.use('/data/snd', express.static(
      path.join(staticPath, 'public', 'snd')
    ))

    app.use('/data/presets/poses', express.static(
      path.join(electronApp.getPath('userData'), 'presets', 'poses')
    ))

    app.use('/data/presets/handPoses', express.static(
      path.join(electronApp.getPath('userData'), 'presets', 'handPoses')
    ))

    app.use('/boards/images', express.static(
      path.join(path.dirname(store.getState().meta.storyboarderFilePath), 'images')
    ))

    app.get('/', function(req, res) {
      res.sendFile(path.join(staticPath, 'js/xr/dist', 'index.html'))
    })

    app.get('/sg.json', (req, res) => {
      const state = store.getState()
      const serializedState = getSerializedState(state)

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
          https://localhost:1234/sg.json

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

    app.get('/presets/handPoses.json', (req, res) => {
      const { presets } = store.getState()
      res.json(presets.handPoses)
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
        let { board } = await service.saveShot()
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

    // app.use(function (req, res, next) {
    //   res.status(404).send('Not found')
    // })

    try {
      let ip = getIpAddress()

      // via https://expressjs.com/en/4x/api.html#app.listen
      const server = https.createServer({ ...generateCertificate() }, app)
      serve(io(server, { wsEngine: 'ws', serveClient: false }), store, service)

      server.on('error', err => {
        console.error(err)
        log.error(err)
      })

      server.listen(PORT, function() {
        let desc = `XRServer running at`

        if (ip) {
          log.info(`${desc} https://${ip}:${PORT}`)

          // there are two servers:
          // createServer creates one on :8000/8001 which is the old default remote input server
          // XRServer creates one on :1234 for XR/VR
          store.dispatch(updateServer({ xrUri: `https://${ip}:${PORT}` }))
        } else {
          log.error('Could not determine IP address')
        }
      })
    } catch (err) {
      log.error('HTTPS server failed. Could not find key.pem or cert.pem')
      log.error(err)
      throw err
    }
  }
}

module.exports = XRServer
