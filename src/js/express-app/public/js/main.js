/* 

TODO:

On reconnect ask for current image
listen for image
send stroke data
ui design
blocking if there is no connection

*/

var socket = io.connect('/', {reconnectionDelay: 200, reconnectionDelayMax: 500});

socket.on('connect_error', function (data) {
  console.log("connect error - are you sure Storyboarder is running on your computer?")
  console.log(data);

});

socket.on('reconnect', function (data) {
  console.log("reconnected!!!")
  console.log(data);
});

document.body.onpointermove = (e) => {
  console.log(e)
  socket.emit('pointerEvent', { my: e.clientX, pressure: e.pressure });
}

let inputField = document.querySelector("#file")

document.addEventListener("click", function(e) {
  window.document.body.webkitRequestFullscreen()
  window.screen.orientation.lock("landscape")
}, false);




inputField.addEventListener('change', function (e) {
  let file = e.target.files[0]
  if (file) {
    if (/^image\//i.test(file.type)) {
      readFile(file)
    } else {
      alert('Not a valid image!')
    }
  }
})

function readFile(file) {
  var reader = new FileReader();

  reader.onloadend = function () {
    processFile(reader.result, file.type);
  }

  reader.onerror = function () {
    alert('There was an error reading the file!');
  }

  reader.readAsDataURL(file);
}

function processFile(dataURL, fileType) {
  var maxWidth = 800;
  var maxHeight = 800;

  var image = new Image();
  image.src = dataURL;

  image.onload = function () {
    sendFile(dataURL);
  };

  image.onerror = function () {
    alert('There was an error processing your file!');
  };
}

function sendFile(fileData) {
  socket.emit('image', { fileData: fileData });
}