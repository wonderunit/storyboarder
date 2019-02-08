const express = require('express')
const WebSocket = require('ws')
const path = require('path')

const os = require('os')
const dns = require('dns')

const web = express()
const port = 8001

const wss = new WebSocket.Server({ port: 8080 })

module.exports = function ({
  setInputAccel,
  setInputMag,
  setInputSensor, // TODO do we need this?
  setInputDown,
  setInputMouseMode,
  setInputOrbitMode
}) {
  wss.on('connection', function connection (ws) {
    console.log('got connection')
    ws.on('message', function incoming (message) {
      let values = JSON.parse(message)
      if (values.accel) {
        setInputAccel(values.accel)
      }
      if (values.mag) {
        setInputMag(values.mag)
      }
      // TODO is this even used?
      if (values.sensor) {
        setInputSensor(values.sensor)
      }
      if (values.down != null) {
        setInputDown(values.down)
      }

      if (values.mouseMode != null) {
        setInputMouseMode(values.mouseMode)
      }

      if (values.orbitMode != null) {        
        setInputOrbitMode(values.orbitMode)
      }
    })
  })

  web.use(express.json())

  web.use('/static', express.static(
    path.join(__dirname, '..', 'shot-generator', 'server', 'public'))
  )

  web.get('/', function(req, res) {
    res.sendFile(path.join(__dirname, '..', 'shot-generator', 'server', 'public', 'index.html'))
  })

  web.listen(port, () => {
    let hostname = os.hostname()
    dns.lookup(hostname, function (err, addr, fam) {
      if (err) {
        console.error(err)
        console.log("shot-generator web client at http://" + hostname + ":" + port)
        return
      }
      console.log("shot-generator web client at http://" + addr + ":" + port)
    })
  })
}
