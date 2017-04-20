const EventEmitter = require('events').EventEmitter

const os = require('os')
const path = require('path')

const express = require('express')
const app = express()
const http = require('http').Server(app)
const io = require('socket.io')(http)

const portNumber = 1888

class MobileServer extends EventEmitter {

  constructor () {
    super()
    const that = this

    app.use('/static', express.static(path.join(__dirname, 'public')))

    app.get('/', function(req, res){
      res.sendFile(__dirname + '/index.html')
    });

    http.listen(portNumber, function(){
      let hostname = os.hostname()
      console.log("http://" + hostname + ":" + portNumber)
      require('dns').lookup(hostname, function (err, add, fam) {
        console.log("http://" + add + ":" + portNumber)
      })
    });

    io.on('connection', function (socket) {
      //socket.emit('news', { hello: 'world' });
      socket.on('pointerEvent', function (data) {
        that.emit('pointerEvent', data)
      });

      socket.on('image', function (data) {
        that.emit('image', data)
      });
    });


  }



}


module.exports = MobileServer
