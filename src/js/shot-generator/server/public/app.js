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
    }, 500)
  }

  socket.onerror = function(err) {
    console.error('Socket encountered error: ', err.message, 'Closing socket')
    socket.close()
  };
}

connect()

setInterval(()=>{
  if (socket.readyState !== 0 || socket.readyState !== 1) {
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

console.log(document.getElementById("container"))

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

console.log('hi')

window.addEventListener('touchstart', event => {
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
