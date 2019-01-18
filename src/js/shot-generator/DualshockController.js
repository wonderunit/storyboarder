// https://gamedev.stackexchange.com/questions/87106/accessing-dualshock-4-motion-sensor-in-windows-ideally-unity/87178#87178
// http://blog.tkjelectronics.dk/2014/01/ps4-controller-now-supported-by-the-usb-host-library/#more-4247
// https://github.com/bildr-org/6dof/blob/master/FreeSixIMU/FreeSixIMU.cpp
// https://github.com/xonoxitron/AHRS-Sensors-Fusion-JS

/*

map:

ANALOG:

left stick:
  move camera
right stick:
  rotate camera
  if selected, orbit around object

DIGITAL:

trackpad:
  mouse

d-pad:
  move selected object

button 1 square:
  zoom in
button 2 triangle:
  zoom out
button 3 circle:
  rotate object
button 4 x:
  add object/menu

l bumper:
  toggle topdown/perspective camera
l trigger:
  deselect all
r bumper:
  toggle through all cameras
r trigger:
  select mode (while holding, point to a object)

*/

console.log("dual shock controller class")

// this package allows for cheap polling of usb connections
const usbDetect = require('usb-detection')
const ds = require('dualshock')
const robot = require("robotjs")

let controllerConnected = false
let checkTimeout

let gamepad

let mouseMode = false
let startX
let xCountdown = 1
let startY
let YCountdown = 1
let mousePos
let virtualMousePos
let padDown = false

module.exports = function ( updater ) {
  usbDetect.startMonitoring()

  // Detect add/insert
  usbDetect.on('add', function(device) {
    // check for a controller
    console.log('add', device)

    if (!controllerConnected) {
      clearTimeout(checkTimeout)
      checkTimeout = setTimeout(checkForController, 3000)
    }
  })

  let checkForController = () => {
    //ds.reset()
    let list = ds.getDevices()
    console.log("Devices:",list)
    if (list.length < 1) {
      console.log("Could not find a controller!")
      return
    }

    // get only the first controller if multiple
    let device = list[0]
    gamepad = ds.open(device, {smoothAnalog:10, smoothMotion:5, joyDeadband:4, moveDeadband:4})
    // gamepad.initMotionDataBT() // not implemented in dualshock@3.1.1, only in our vendored version
    controllerConnected = true
    console.log("Controller connected")

    gamepad.ondisconnect = () => {
      console.log("Controller disconnected!")
      controllerConnected = false
    }
    gamepad.onerror = (error) => {
      console.log(error)
    }

    gamepad.ondigital = (button, value) => {
      console.log("BUTTON '"+button+"' = "+value)
      //rumbleScript(button, value, 'd', this)
      if (value) {
        // gamepad.rumbleAdd(94, 0, 255, 0)
        gamepad.setLed(Math.floor(Math.random()*255),Math.floor(Math.random()*255),Math.floor(Math.random()*255))
      } else {
        // gamepad.rumble(0, 0)
        gamepad.setLed(0,0,0)
      }

      if (button == 'pad' && value && !padDown) {
        padDown = true
        console.log('click')
        robot.mouseClick()
      }

      if (button == 'pad' && !value) {
        padDown = false
        //console.log('click')
      }


      if (button == 't1' && value && !mouseMode) {
        startX = null
        startY = null
        mouseMode = true
        yCountdown = 3
        mousePos = robot.getMousePos()
        robot.setMouseDelay(0)
        virtualMousePos = {x: mousePos.x, y: mousePos.y}
      }

      if (button == 't1' && !value) {
        startX = null
        startY = null
        mouseMode = false
        yCountdown = 3
        mousePos = robot.getMousePos()
        virtualMousePos = {x: mousePos.x, y: mousePos.y}
      }

    }

    gamepad.onanalog = (axis, value) => {
  	//	 console.log("ANALOG '"+axis+"' = "+value);
      //rumbleScript(axis, value, 'a', this);
      if (axis == 't1Y'){
        if (!mouseMode) {
          startY = null
          yCountdown = 3
        } else {
          yCountdown--
          if (!startY && yCountdown < 0) { startY = value}
          if (yCountdown < 0) {
            virtualMousePos.y = mousePos.y - ((startY - value)/2.0)
            robot.moveMouse(virtualMousePos.x, virtualMousePos.y)
          }
        }
      }

      if (axis == 't1X'){
        if (!mouseMode) {
          startX = null
          xCountdown = 3
        } else {
          xCountdown--
          if (!startX && xCountdown < 0) { startX = value}
          if (xCountdown < 0) {
            virtualMousePos.x = mousePos.x - ((startX - value)/2.0)
            robot.moveMouse(virtualMousePos.x, virtualMousePos.y)
          }
        }
      }

  	}

    gamepad.onmotion = (axis, value) => {
  		// console.log("MOTION '"+axis+"' = "+value);
      if (axis === 'gyroYaw') {
        // console.log(axis, value)
      }
      //rumbleScript(axis, value, 'a', this);
      //console.log(mouseMode, startY)
  	}

    // gamepad.onmotion = true;

    gamepad.onstatus = true

    let max = 0
    let min = 0

    gamepad.onupdate = function (changed) {
      updater(this, changed)
    }

  	// gamepad.onupdate = function(changed) {
  	// 	//rumbleScript(changed, this);
  	// 	//Uncomment one of these lines for debugging!
  	// 	//console.log(this.digital);
    //   //console.log(this.analog);
    //   max = Math.max(max, this.motion.gyroPitch)
    //   min = Math.min(min, this.motion.gyroPitch)
    //
    //   const {
    //     accelX,
    //     accelY,
    //     accelZ,
    //     gyroPitch,
    //     gyroRoll,
    //     gyroYaw
    //   } = this.motion
    //
    //   updater({
    //     circle: this.digital.circle,
    //
    //     accelX,
    //     accelY,
    //     accelZ,
    //     gyroPitch,
    //     gyroRoll,
    //     gyroYaw
    //   })

  // accel = new Vector3(
  //             System.BitConverter.ToInt16(_inputBuffer, 19),
  //             System.BitConverter.ToInt16(_inputBuffer, 21),
  //             System.BitConverter.ToInt16(_inputBuffer, 23)
  //             )/8192f;

  // gyro = new Vector3(
  //             System.BitConverter.ToInt16(_inputBuffer, 13),
  //             System.BitConverter.ToInt16(_inputBuffer, 15),
  //             System.BitConverter.ToInt16(_inputBuffer, 17)
  //             )/1024f;
  		// console.log(min,max)

      // console.log(this.motion.accelX, this.motion.accelY, this.motion.accelZ, this.motion.gyroPitch, this.motion.gyroRoll, this.motion.gyroYaw)
  	// }

  }

  checkForController()
}
