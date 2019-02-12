let mouseOn = false;
let down = false
let alpha
let beta
let gamma
let mouseMode = false
let cameraMode = false

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
    }, 500)
  }

  socket.onerror = function(err) {
    console.error('Socket encountered error: ', err.message, 'Closing socket')
    socket.close()
  };
}

connect()

setInterval(()=>{
  if (socket.readyState !== 0 && socket.readyState !== 1) {
    socket.close()
  }
},1000)


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


document.getElementById("container").addEventListener('touchend', event => {
  //alert('hi')

  var elem = document.documentElement
  if (elem.requestFullScreen) {
    elem.requestFullScreen();
  } else if (elem.mozRequestFullScreen) {
    elem.mozRequestFullScreen();
  } else if (elem.webkitRequestFullScreen) {
    elem.webkitRequestFullScreen();
  }
  screen.orientation.lock('portrait-primary')
})

document.getElementById("rotate3d").addEventListener('touchstart', event => {

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
  // report({
  //   mouseMode: mouseOn
  // })
})

document.getElementById("rotate3d").addEventListener('touchmove', event => {
  event.preventDefault()
})

document.getElementById("rotate3d").addEventListener('touchend', event => {
  down = false
  event.preventDefault()
  report({
    down: false
  })
})

document.getElementById("rotate3d").addEventListener('touchcancel', event => {
  down = false
  event.preventDefault()
  report({
    down: false
  })
})

document.getElementById("phoneSelect").addEventListener('touchstart', event => {

  down = true
  event.preventDefault();
  mouseOn = true
  
  report({
    mag: [alpha, beta, gamma]
  })
  report({
    mouseMode: true
  })
  report({
    down: true
  })
  report({
    mag: [alpha, beta, gamma]
  })  
})

document.getElementById("phoneSelect").addEventListener('touchmove', event => {
  event.preventDefault()
})

document.getElementById("phoneSelect").addEventListener('touchend', event => {
  down = false
  mouseOn = false;
  event.preventDefault()

  
  report({
    down: false
  })  
  report({
    mouseMode: false
  })
  report({
    mag: [alpha, beta, gamma]
  })
})

document.getElementById("phoneSelect").addEventListener('touchcancel', event => {
  down = false
  mouseOn = false;
  event.preventDefault()
  
  report({
    down: false
  })  
  report({
    mouseMode: false
  })
  report({
    mag: [alpha, beta, gamma]
  })
})

document.getElementById("cameraOrbit").addEventListener('touchstart', event => {

  down = true
  event.preventDefault();
  mouseOn = true
  report({
    mag: [alpha, beta, gamma]
  })
  report({
    orbitMode: true
  })
  report({
    mouseMode: true
  })
  report({
    down: true
  })
  
  
  
  
  report({
    mag: [alpha, beta, gamma]
  })  
})

document.getElementById("cameraOrbit").addEventListener('touchmove', event => {
  event.preventDefault()
})

document.getElementById("cameraOrbit").addEventListener('touchend', event => {
  down = false
  mouseOn = false;
  event.preventDefault()
  
  report({
    down: false
  })
  report({
    orbitMode: false
  })
  
  report({
    mouseMode: false
  })
  report({
    mag: [alpha, beta, gamma]
  })
  
})

document.getElementById("cameraOrbit").addEventListener('touchcancel', event => {
  down = false
  mouseOn = false;
  event.preventDefault()
  
  report({
    orbitMode: false
  })
  report({
    down: false
  })  
  report({
    mouseMode: false
  })
  report({
    mag: [alpha, beta, gamma]
  })
})