const { ipcRenderer, shell } = require('electron')
const { app } = require('electron').remote
const electronUtil = require('electron-util')

const React = require('react')
const { useRef } = React
const { Provider, connect } = require('react-redux')
const ReactDOM = require('react-dom')
console.clear() // clear the annoying dev tools warning



// TODO use the main Storyboarder store instead of a special one for Shot Generator
//
// configureStore:
const { createStore, applyMiddleware } = require('redux')
const thunkMiddleware = require('redux-thunk').default
const { reducer } = require('../../shared/reducers/shot-generator')
const configureStore = function configureStore (preloadedState) {
  const store = createStore(reducer, preloadedState, applyMiddleware(thunkMiddleware))
  return store
}



const h = require('../../utils/h')
const Editor = require('../../shot-generator/Editor')

const presetsStorage = require('../../shared/store/presetsStorage')
const { initialState } = require('../../shared/reducers/shot-generator')

const store = configureStore({
  ...initialState,
  presets: {
    ...initialState.presets,
    scenes: {
      ...initialState.presets.scenes,
      ...presetsStorage.loadScenePresets().scenes
    },
    characters: {
      ...initialState.presets.characters,
      ...presetsStorage.loadCharacterPresets().characters
    },
    poses: {
      ...initialState.presets.poses,
      ...presetsStorage.loadPosePresets().poses
    }
  },
})



ipcRenderer.on('loadShot', (event, shot) => {
  store.dispatch({
    type: 'LOAD_SCENE',
    payload: shot.data
  })
})



window.$r = { store }

// disabled for now so we can reload the window easily during development
// ipcRenderer.once('ready', () => {})

console.log('ready!')
electronUtil.disableZoom()

ReactDOM.render(
  h([
    Provider, { store }, [
      Editor
    ]
  ]),
  document.getElementById('main')
)


const express = require('express')
const web = express()
const port = 8001

web.use(express.json())

web.post('/data', (req, res) => {
  // console.log('got data', JSON.stringify(req.body))

  if (req.body.accel) {
    store.dispatch({ type: 'SET_INPUT_ACCEL', payload: req.body.accel })
  }
  if (req.body.mag) {
    store.dispatch({ type: 'SET_INPUT_MAG', payload: req.body.mag })
  }
  if (req.body.sensor) {
    store.dispatch({ type: 'SET_INPUT_SENSOR', payload: req.body.sensor })
  }
  if (req.body.down != null) {
    store.dispatch({ type: 'SET_INPUT_DOWN', payload: req.body.down })
  }

  if (req.body.mouseMode != null) {
    store.dispatch({ type: 'SET_INPUT_MOUSEMODE', payload: req.body.mouseMode })
  }

  if (req.body.mouseModeClick != null) {
    store.dispatch({type: 'SET_INPUT_PHONE_CLICK', payload: req.body.mouseModeClick})
  }

  res.send(req.body)
})

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

    function report (values) {
      fetch('/data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8'
        },
        body: JSON.stringify(values)
      })
    }

    document.getElementById("mouseButtonClick").addEventListener('touchstart', event => {
      event.preventDefault();
      //document.getElementById("debugger").innerHTML += "<br>Mouse click: "+mouseModeClick;
      mouseModeClick = true;
      report({
        mouseModeClick: mouseModeClick
      })
      event.stopPropagation();
    })

    document.getElementById("mouseButtonClick").addEventListener('touchend', event => {
      event.preventDefault();
      //document.getElementById("debugger").innerHTML += "<br>Mouse click: "+mouseModeClick;
      mouseModeClick = false;
      report({
        mouseModeClick: mouseModeClick
      })
      //event.stopPropagation();
    })

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
      event.stopPropagation();
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

      if (down) {
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
