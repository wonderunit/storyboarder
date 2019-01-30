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

document.getElementById("container").addEventListener('touchstart', event => {
  //fullscreen()

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

document.getElementById("container").addEventListener('touchmove', event => {
  event.preventDefault()
})

document.getElementById("container").addEventListener('touchend', event => {
  down = false
  event.preventDefault()
  report({
    down: false
  })
})

document.getElementById("container").addEventListener('touchcancel', event => {
  down = false
  event.preventDefault()
  report({
    down: false
  })
})

document.getElementById("phoneSelect").addEventListener('touchstart', event => {
  event.preventDefault();
  mouseOn = !mouseOn;
  
  report({
    down: true
  })
  report({
    mag: [alpha, beta, gamma]
  })
  report({
    mouseMode: mouseOn
  })
})

document.getElementById("phoneSelect").addEventListener('touchend', event => {
  down = false
  mouseOn = !mouseOn;
  event.preventDefault()
  report({
    down: false
  })
  report({
    mouseModeClick: true
  })
  report({
    mouseModeClick: false
    })
})

document.getElementById("phoneSelect").addEventListener('touchcancel', event => {
  down = false
  mouseOn = !mouseOn;
  event.preventDefault()
  report({
    down: false
  })
})

document.getElementById("mouseButtonClick").addEventListener('touchstart', event => {
  event.preventDefault();
  mouseModeClick = true;

  report({
    mouseModeClick: mouseModeClick
  })
  mouseModeClick = false;
  report({
    mouseModeClick: mouseModeClick
    })
})

