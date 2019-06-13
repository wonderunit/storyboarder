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
  setInputOrbitMode,

  updateServer = () => {}
}) {
  wss.on('connection', function connection (ws, req) {
    updateServer({ client: req.connection.remoteAddress })

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

    ws.on('close', function () {
      updateServer({ client: undefined })
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
          updateServer({
            uri: `http://${ip}:${port}`
          })
        } else {
          console.error(err)
          updateServer({
            uri: `http://${hostname}:${port}`
          })
        }
        return
      }

      updateServer({
        uri: `http://${addr}:${port}`
      })
    })
  })
}
