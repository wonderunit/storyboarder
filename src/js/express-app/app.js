const EventEmitter = require('events').EventEmitter

const os = require('os')
const path = require('path')

const express = require('express')
const app = express()
const http = require('http').Server(app)
const io = require('socket.io')(http, { wsEngine: 'ws' })

const portNumber = 1888

const model = {
  canImport: false,

  present (data) {
    if (typeof data.canImport !== 'undefined') model.canImport = data.canImport

    state.render(model)
  }
}

let state = {
  render (model) {
    // broadcast every change that the mobile app might care about
    io.of('/').emit('canImport', model.canImport)
  }
}

class MobileServer extends EventEmitter {

  constructor () {
    super()
    const that = this

    app.use('/static', express.static(path.join(__dirname, 'public')))

    app.get('/', function(req, res) {
      res.sendFile(__dirname + '/index.html')
    })

    http.on('error', err => {
      that.emit('error', err)
    })

    http.listen(portNumber, function() {
      let hostname = os.hostname()
      console.log("http://" + hostname + ":" + portNumber)
      require('dns').lookup(hostname, function (err, add, fam) {
        console.log("http://" + add + ":" + portNumber)
      })
    })

    io.on('connection', function (socket) {
      // re-broadcast state
      state.render(model)

      //socket.emit('news', { hello: 'world' });
      socket.on('pointerEvent', function (data) {
        that.emit('pointerEvent', data)
      })

      socket.on('image', function (data) {
        that.emit('image', data)
      })

      socket.on('worksheet', function (data) {
        that.emit('worksheet', data)
      })
    })
  }

  setCanImport (canImport) {
    model.present({ canImport })
  }
}

module.exports = MobileServer
