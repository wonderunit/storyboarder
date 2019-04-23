const os = require('os')
const path = require('path')

const express = require('express')
const app = express()
const http = require('http').Server(app)

const portNumber = 1234

const Bundler = require('parcel-bundler')

const { getSerializedState } = require('../shared/reducers/shot-generator')

class XRServer {
  constructor ({ store }) {

    app.get('/state.json', (req, res) => {
      res.json(getSerializedState(store.getState()))
    })

    const file = __dirname + '/src/index.html'
    const bundler = new Bundler(file, {
      hmr: false,
      target: 'browser'
    })
    app.use(bundler.middleware())

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
