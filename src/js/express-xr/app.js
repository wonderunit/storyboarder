const os = require('os')
const path = require('path')
const dns = require('dns')

const express = require('express')
const electron = require('electron')
const electronApp = electron.app ? electron.app : electron.remote.app

const app = express()
const http = require('http').Server(app)

const log = require('electron-log')

const portNumber = 1234

const { getSerializedState, updateServer } = require('../shared/reducers/shot-generator')

class XRServer {
  constructor ({ store }) {
    app.use(express.json())

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

    app.get('/state.json', (req, res) => {
      const state = store.getState()
      const { aspectRatio } = state

      res.json({
        ...getSerializedState(state),

        aspectRatio,
        presets: {
          poses: state.presets.poses
        }
      })
    })

    app.post('/state.json', (req, res) => {
      let { state } = req.body
      let { world, sceneObjects, activeCamera } = state

      store.dispatch({ type: 'LOAD_SCENE', payload: { world, sceneObjects, activeCamera} })

      res.status(200).send({ ok: true })
    })

    http.on('error', err => {
      console.error(err)
    })

    http.listen(portNumber, function() {
      let desc = `XRServer running at`

      new Promise(resolve => {
        let hostname = os.hostname()
        dns.lookup(hostname, function (err, addr) {
          if (err) {
            // use IP address instead of .local
            let ip
            if (hostname.match(/\.local$/)) {
              ip = Object.values(os.networkInterfaces()).reduce(
                (r, list) =>
                  r.concat(
                    list.reduce(
                      (rr, i) =>
                        rr.concat((i.family === "IPv4" && !i.internal && i.address) || []),
                      []
                    )
                  ),
                []
              )
            }
            if (ip) {
              resolve(ip)
            } else {
              log.error(err)
              resolve(hostname)
            }
            return
          }

          resolve(addr)
        })
      })
      .then(result => {
        log.info(`${desc} http://${result}:${portNumber}`)

        // there are two servers:
        // createServer creates one on :8000/8001 which is the old default remote input server
        // XRServer creates one on :1234 for XR/VR
        store.dispatch(updateServer({ xrUri: `http://${result}:${portNumber}` }))
      })
      .catch(err => log.error(err))
    })
  }
}

module.exports = XRServer
