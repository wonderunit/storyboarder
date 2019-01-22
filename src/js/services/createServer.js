const express = require('express')
const WebSocket = require('ws')

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

  web.get('/', (req, res) => res.send(`
    <html>
    <head>
      <meta name="viewport" content="width=device-width, height=device-height, initial-scale=1.0, minimum-scale=1.0">

      <script src="https://cdnjs.cloudflare.com/ajax/libs/lodash.js/4.17.11/lodash.js"></script>

      <style>
        html, body {
          position: fixed;
          margin: 0;
          height: 100%;
          -moz-user-select: none;
          -khtml-user-select: none;
          -webkit-user-select: none;
          -ms-user-select: none;
          user-select: none;
        }
      </style>
    </head>
    <body>
      <script type="module">

      screen.lockOrientationUniversal = screen.lockOrientation || screen.mozLockOrientation || screen.msLockOrientation
      if (screen.lockOrientationUniversal) {
        screen.lockOrientationUniversal("portrait")
      }
      if (screen.orientation) {
        screen.orientation.lock()
      }



      let mouseOn = false;
      let down = false
      let alpha
      let beta
      let gamma
      let mouseMode = false
      let mouseModeClick = false

      function log (string) {
        document.body.innerHTML += string + "<br/>"
      }

      let socket

      function connect() {
        socket = new WebSocket('ws://' + window.location.hostname + ':8080')

        socket.onopen = function() {
          // send a message that phone connected maybe?
          // socket.send(JSON.stringify({
          //     //.... some message the I must send when I connect ....
          // }))
        };

        socket.onmessage = function(e) {
          // message from the server
          console.log('Message:', e.data)
        }

        socket.onclose = function(e) {
          console.log('Socket is closed. Reconnect will be attempted in 1 second.', e.reason)
          setTimeout(function() {
            connect()
          }, 1000)
        }

        socket.onerror = function(err) {
          console.error('Socket encountered error: ', err.message, 'Closing socket')
          socket.close()
        };
      }

      connect()

      function report (values) {
        socket.send(JSON.stringify(values))

        // fetch('/data', {
        //   method: 'POST',
        //   headers: {
        //     'Content-Type': 'application/json; charset=utf-8'
        //   },
        //   body: JSON.stringify(values)
        // })



      }

      document.getElementById("mouseButton").addEventListener('touchstart', event => {
        event.preventDefault();
        mouseOn = !mouseOn;
        if (mouseOn) {
          document.getElementById("mouseButton").innerHTML = "3D rotation"
        } else {
          document.getElementById("mouseButton").innerHTML = "Cursor mode"
         }
        //document.getElementById("debugger").innerHTML += "<br>Mouse mode on touch: "+mouseOn;
        report({
          mouseMode: mouseOn
        })
        //event.stopPropagation();
      })

    document.getElementById("mouseButtonClick").addEventListener('touchstart', event => {
      event.preventDefault();
      mouseModeClick = true;
      //document.getElementById("debugger").innerHTML += "<br>Mouse click: "+mouseModeClick;

      report({
        mouseModeClick: mouseModeClick
       })
       mouseModeClick = false;
       report({
         mouseModeClick: mouseModeClick
        })
      //event.stopPropagation();
    })

      if(window.DeviceMotionEvent){
        window.addEventListener("devicemotion", motion, false);
      }else{
        log("DeviceMotionEvent is not supported");
      }
      function motion(event){
        // log("Accelerometer: "
        //   + event.accelerationIncludingGravity.x + ", "
        //   + event.accelerationIncludingGravity.y + ", "
        //   + event.accelerationIncludingGravity.z
        // );
        // report({
        //   accel: [event.accelerationIncludingGravity.x, event.accelerationIncludingGravity.y, event.accelerationIncludingGravity.z]
        // })
      }

      if(window.DeviceOrientationEvent){
        window.addEventListener("deviceorientation", _.throttle(orientation, 50), false);
      }else{
        log("DeviceOrientationEvent is not supported");
      }
      function orientation(event){
        // log("Magnetometer: "
        //   + event.alpha + ", "
        //   + event.beta + ", "
        //   + event.gamma
        // );

        alpha = event.alpha
        beta = event.beta
        gamma = event.gamma

        if (down && !mouseModeClick) {
          report({
            mag: [event.alpha, event.beta, event.gamma]
          })
          }
      }

      // if (window.DeviceOrientationEvent) {
      //   window.addEventListener("deviceorientation", function() {
      //     tilt([event.beta, event.gamma])
      //   }, true)
      // } else if (window.DeviceMotionEvent) {
      //   window.addEventListener('devicemotion', function() {
      //     tilt([event.acceleration.x * 2, event.acceleration.y * 2])
      //   }, true)
      // } else {
      //   window.addEventListener("MozOrientation", function() {
      //     tilt([orientation.x * 50, orientation.y * 50])
      //   }, true)
      // }

      window.addEventListener('touchstart', event => {
        down = true
        event.preventDefault()
        report({
          mag: [alpha, beta, gamma]
        })

        report({
          down: true
        })
        report({
          mag: [alpha, beta, gamma]
        })
        //document.getElementById("debugger").innerHTML += "<br>Mouse mode: "+mouseOn;
        report({
          mouseMode: mouseOn
        })
      })

      window.addEventListener('touchmove', event => {
        event.preventDefault()
      })

      window.addEventListener('touchend', event => {
        down = false
        event.preventDefault()
        report({
          down: false
        })
      })

      window.addEventListener('touchcancel', event => {
        down = false
        event.preventDefault()
        report({
          down: false
        })
      })



      //log('Ready')

      </script>
      <div id="debugger" style="top: 0px;width: 100vw;height: 50vh;position:absolute;z-index:15;">
      </div>
      <div id="container" style="width: 100vw;height: 100%;background-color: #EEEEEE;position: absolute;padding: 0;margin:  0;">
        <div id="footer" style="position:absolute; bottom: 0px; height: 220px; width: 100%;">
          <div id="mouseButtonClick" style="padding: 20px;margin: 20px;width: 160px;text-align: center;margin-left: auto;margin-right: auto;font-size: 16px;position: relative;top: auto;margin-bottom:30px; background-color: #404040;color: #ffffff;cursor: pointer;">
            Click!
          </div>
          <div id="mouseButton" style="padding: 20px;margin: 20px;width: 160px;text-align: center;margin-left: auto;margin-right: auto;margin-bottom: 20px;font-size: 16px;position: relative;top: auto;bottom:10px; background-color: #404040;color: #ffffff;cursor: pointer;">
            Cursor mode
          </div>
        </div>
      </div>
    </body>
    </html>
  `))

  web.post('/')

  web.listen(port, () => console.log(`Example app listening on port ${port}!`))
}
