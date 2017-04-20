var socket = io.connect('/');

socket.on('news', function (data) {
  console.log(data);
  socket.emit('my other event', { my: 'data' });
});

document.body.onpointermove = (e) => {
  console.log(e)
  socket.emit('pointerEvent', { my: e.clientX, pressure: e.pressure });
}

let inputField = document.querySelector("#file")

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