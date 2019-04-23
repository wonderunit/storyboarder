const os = require('os')
const path = require('path')

const express = require('express')
const app = express()
const http = require('http').Server(app)

const portNumber = 1234

const { getSerializedState } = require('../shared/reducers/shot-generator')

class XRServer {
  constructor ({ store }) {

    app.use('/', express.static(
      path.join(__dirname, 'dist'))
    )

    app.get('/', function(req, res) {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'))
    })

    app.get('/state.json', (req, res) => {
      res.json(getSerializedState(store.getState()))
    })

    http.on('error', err => {
      that.emit('error', err)
    })

    http.listen(portNumber, function() {
      console.log('running server')
      // let hostname = os.hostname()
      // console.log('http://' + hostname + ':' + portNumber)
      // require('dns').lookup(hostname, function (err, add, fam) {
      //   console.log('http://' + add + ':' + portNumber)
      // })
    })
  }
}

module.exports = XRServer
