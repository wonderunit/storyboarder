const express = require('express')
const WebSocket = require('ws')
const path = require('path')

const web = express()
const port = 8001

const wss = new WebSocket.Server({ port: 8080 })

module.exports = function ({
  setInputAccel,
  setInputMag,
  setInputSensor, // TODO do we need this?
  setInputDown,
  setInputMouseMode,
  setInputPhoneClick
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

      if (values.mouseModeClick != null) {
        setInputPhoneClick(values.mouseModeClick)
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

  web.listen(port, () => console.log(`Example app listening on port ${port}!`))
}
