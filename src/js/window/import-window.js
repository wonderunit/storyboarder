const {ipcRenderer, shell, remote} = require('electron')
const prefModule = require('electron').remote.require('./prefs.js')
const pdf = require('pdfjs-dist')
const worksheetPrinter = require('./worksheet-printer.js')
const storyTips = new(require('./story-tips'))
const child_process = require('child_process')
const app = require('electron').remote.app
const os = require('os')
const path = require('path')
const jsfeat = require('../vendor/jsfeat-min.js')
const fs = require('fs')
const QrCode = require('qrcode-reader');

document.querySelector('#close-button').onclick = (e) => {
  ipcRenderer.send('playsfx', 'negative')
  let window = remote.getCurrentWindow()
  window.hide()
}

const loadWindow = () => {
  let image = new Image()

  image.onload = () => {
    console.log("IMAGE LOADED!!!!")

    // STEP
    // create a 1500px wide image to deal with
    let canvas = document.createElement('canvas')
    let imageAspect = image.width/image.height
    canvas.width = 1500
    canvas.height = Math.round(1500/imageAspect)
    let context = canvas.getContext('2d')
    context.drawImage(image, 0,0, canvas.width, canvas.height)
    let imageData = context.getImageData(0, 0, canvas.width, canvas.height)

    // STEP
    // get pixels greyscale from photo
    let img_u8 = new jsfeat.matrix_t(canvas.width, canvas.height, jsfeat.U8C1_t);
    jsfeat.imgproc.grayscale(imageData.data, canvas.width, canvas.height, img_u8);
    imageData = context.getImageData(0, 0, canvas.width, canvas.height)
    outputImage(img_u8, context, 'step1.png')

    // STEP
    // gaussian blur to remove noise and small lines
    var r = 8;
    var kernel_size = (r+1) << 1;
    jsfeat.imgproc.gaussian_blur(img_u8, img_u8, kernel_size, 0);
    outputImage(img_u8, context, 'step2.png')

    // STEP
    // canny edge detection to find lines
    jsfeat.imgproc.canny(img_u8, img_u8, 10, 50);
    outputImage(img_u8, context, 'step3.png')

    // STEP
    // perform hough transform to find all lines greater than 250 strength
    let lines = jsfeat.imgproc.hough_transform(img_u8, 1, Math.PI/500,250)

    // STEP
    // reverse array so strongest results are first
    lines.reverse()

    // STEP
    // add each line candidtate to an array
    let lineCandidates = []
    for (let line of lines) {
      let rho = line[0]
      let theta = line[1]
      let a = Math.cos(theta)
      let b = Math.sin(theta)
      let x0 = a*rho
      let y0 = b*rho
      let x1 = Math.round(x0 + 2000*(-b))
      let y1 = Math.round(y0 + 2000*(a))
      let x2 = Math.round(x0 - 2000*(-b))
      let y2 = Math.round(y0 - 2000*(a))
      context.strokeStyle="#FF0000"
      context.beginPath()
      context.moveTo(x1, y1)
      context.lineTo(x2, y2)
      context.stroke()
      lineCandidates.push([x1, y1, x2, y2, rho, theta])
    }

    // STEP
    // remove lines that are similar angles and very close to each other. keep the most dominant line.
    for (var g = 0; g < 4; g++) {
      var lineCandidatesClone = lineCandidates.slice(0)
      for (var z = 0; z < lineCandidates.length; z++) {
        for (var y = z; y < lineCandidates.length; y++) {
          if (z !== y) {
            let line1 = lineCandidates[z]
            let line2 = lineCandidates[y]
            let anglediff = angleDistance(line1[5],line2[5])
            // distance between midpoint of 2 lines
            let point1 = [((line1[0]+line1[2])/2),((line1[1]+line1[3])/2)]
            let point2 = [((line2[0]+line2[2])/2),((line2[1]+line2[3])/2)]
            let interdiff = distance(point1[0],point1[1],point2[0],point2[1])
            //console.log(anglediff, interdiff)
            if ((anglediff < 0.1) && (interdiff < 30)) {
              if (y > z) {
                lineCandidatesClone.splice(y, 1)
              } else {
                lineCandidatesClone.splice(z, 1)
              }
              //console.log("deleted similar")
            }
          }
        }
      }
      lineCandidates  = lineCandidatesClone
      //console.log("LINES: " + lineCandidates.length)
    }

    // draw line candidates
    for (var z = 0; z < lineCandidates.length; z++) {
      let line = lineCandidates[z]
      if (z < 4) {
        context.strokeStyle="#00FF00"
      } else {
        context.strokeStyle="#0000FF"
      }
      context.beginPath()
      context.moveTo(line[0], line[1])
      context.lineTo(line[2], line[3])
      context.stroke()
    }

    // STEP
    // filter out corner points and add them to an array
    let cornerPoints = []
    if (lineCandidates.length >= 4) {
      for (var z = 0; z < 4; z++) {
        for (var y = z; y < 4; y++) {
          if (z !== y) {
            let line1 = lineCandidates[z]
            let line2 = lineCandidates[y]
            let intersect = checkLineIntersection(line1[0],line1[1],line1[2],line1[3],line2[0],line2[1],line2[2],line2[3])
            if (intersect.x) {
              if (intersect.x > 0 && intersect.y > 0 && intersect.x < context.canvas.width && intersect.y < context.canvas.height) {
                cornerPoints.push([intersect.x/context.canvas.width, intersect.y/context.canvas.height])
                context.fillStyle = 'orange';
                context.fillRect(intersect.x-3, intersect.y-3, 6, 6);
              }
            }
          }
        }
      }
    }
    let imgData = context.canvas.toDataURL().replace(/^data:image\/\w+;base64,/, '')
    fs.writeFileSync('step4.png', imgData, 'base64')

    console.log(cornerPoints)
    // STEP
    // reorder points in the right order
    cornerPoints.sort((b,a) => {
      console.log((Math.atan2(a[0]-0.5,a[1]-0.5)),(Math.atan2(b[0]-0.5,b[1]-0.5)))
      return (Math.atan2(a[0]-0.5,a[1]-0.5))-(Math.atan2(b[0]-0.5,b[1]-0.5))
    })
    cornerPoints.unshift(cornerPoints.pop())

    console.log(cornerPoints)
    // STEP
    // TODO: check the area, should error if too small or less than 4 points

    // STEP 
    // reverse warp to read qr code
    canvas.width = 2500
    canvas.height = Math.round(2500/(11/8.5))
    context = canvas.getContext('2d')
    context.drawImage(image, 0,0, canvas.width, canvas.height)
    imageData = context.getImageData(0, 0, canvas.width, canvas.height);


    img_u8 = new jsfeat.matrix_t(canvas.width, canvas.height, jsfeat.U8_t | jsfeat.C1_t);
    // img_u8_warp = new jsfeat.matrix_t(640, 480, jsfeat.U8_t | jsfeat.C1_t);
    img_u8_warp = new jsfeat.matrix_t(canvas.width, canvas.height, jsfeat.U8_t | jsfeat.C1_t);
    transform = new jsfeat.matrix_t(3, 3, jsfeat.F32_t | jsfeat.C1_t);
    jsfeat.math.perspective_4point_transform(transform, 
                                                    cornerPoints[0][0]*canvas.width,   cornerPoints[0][1]*canvas.height,   0,  0,
                                                    cornerPoints[1][0]*canvas.width,   cornerPoints[1][1]*canvas.height,   canvas.width, 0,
                                                    cornerPoints[2][0]*canvas.width,   cornerPoints[2][1]*canvas.height, canvas.width, canvas.height,
                                                    cornerPoints[3][0]*canvas.width,   cornerPoints[3][1]*canvas.height, 0, canvas.height);
    jsfeat.matmath.invert_3x3(transform, transform);

    jsfeat.imgproc.grayscale(imageData.data, canvas.width, canvas.height, img_u8);
    jsfeat.imgproc.warp_perspective(img_u8, img_u8_warp, transform, 0);

    var data_u32 = new Uint32Array(imageData.data.buffer);
    var alpha = (0xff << 24);
    var i = img_u8_warp.cols*img_u8_warp.rows, pix = 0;
    while(--i >= 0) {
      pix = img_u8_warp.data[i];
      data_u32[i] = alpha | (pix << 16) | (pix << 8) | pix;
    }
    context.putImageData(imageData, 0, 0);
    imgData = context.canvas.toDataURL().replace(/^data:image\/\w+;base64,/, '')
    fs.writeFileSync('step5.png', imgData, 'base64')

    let qrCanvas = document.createElement('canvas')
    qrCanvas.width = 500
    qrCanvas.height = 500
    let qrContext = qrCanvas.getContext('2d')
    qrContext.drawImage(context.canvas, -context.canvas.width+500,0, context.canvas.width, context.canvas.height)
    let qrImageData = qrContext.getImageData(0, 0, qrCanvas.width, qrCanvas.height)

    var newImageData = contrastImage(qrImageData, 150)
    qrContext.putImageData(newImageData, 0, 0);
    
    imgData = qrContext.canvas.toDataURL().replace(/^data:image\/\w+;base64,/, '')
    fs.writeFileSync('step6.png', imgData, 'base64')


    var qr = new QrCode();
    qr.callback = function(err, result) { 
      console.log("GOT BACK RESULT: ", err, result )
      console.log("BEGIN CROPPING:" )
    }
    qr.decode(qrImageData)




    // // equalize
    // jsfeat.imgproc.equalize_histogram(img_u8, img_u8);
    // outputImage(img_u8, context, 'step3.png')



  }

  image.src = '/Users/setpixel/Desktop/test5.jpg'
}

function contrastImage(imageData, contrast) {

    var data = imageData.data;
    var factor = (259 * (contrast + 255)) / (255 * (259 - contrast));

    for(var i=0;i<data.length;i+=4)
    {
        data[i] = factor * (data[i] - 128) + 128;
        data[i+1] = factor * (data[i+1] - 128) + 128;
        data[i+2] = factor * (data[i+2] - 128) + 128;
    }
    return imageData;
}



const distance = ( x1, y1, x2, y2 ) => {
  
  var   xs = x2 - x1,
    ys = y2 - y1;   
  
  xs *= xs;
  ys *= ys;
   
  return Math.sqrt( xs + ys );
};

const angleDistance = (alpha, beta) => {
  let phi = Math.abs(beta - alpha) % Math.PI       // This is either the distance or 360 - distance
  let distance = phi > (Math.PI/2) ? Math.PI - phi : phi
  return distance
}



const checkLineIntersection = (line1StartX, line1StartY, line1EndX, line1EndY, line2StartX, line2StartY, line2EndX, line2EndY) => {
    // if the lines intersect, the result contains the x and y of the intersection (treating the lines as infinite) and booleans for whether line segment 1 or line segment 2 contain the point
    var denominator, a, b, numerator1, numerator2, result = {
        x: null,
        y: null,
        onLine1: false,
        onLine2: false
    };
    denominator = ((line2EndY - line2StartY) * (line1EndX - line1StartX)) - ((line2EndX - line2StartX) * (line1EndY - line1StartY));
    if (denominator == 0) {
        return result;
    }
    a = line1StartY - line2StartY;
    b = line1StartX - line2StartX;
    numerator1 = ((line2EndX - line2StartX) * a) - ((line2EndY - line2StartY) * b);
    numerator2 = ((line1EndX - line1StartX) * a) - ((line1EndY - line1StartY) * b);
    a = numerator1 / denominator;
    b = numerator2 / denominator;

    // if we cast these lines infinitely in both directions, they intersect here:
    result.x = line1StartX + (a * (line1EndX - line1StartX));
    result.y = line1StartY + (a * (line1EndY - line1StartY));
/*
        // it is worth noting that this should be the same as:
        x = line2StartX + (b * (line2EndX - line2StartX));
        y = line2StartX + (b * (line2EndY - line2StartY));
        */
    // if line1 is a segment and line2 is infinite, they intersect if:
    if (a > 0 && a < 1) {
        result.onLine1 = true;
    }
    // if line2 is a segment and line1 is infinite, they intersect if:
    if (b > 0 && b < 1) {
        result.onLine2 = true;
    }
    // if line1 and line2 are segments, they intersect if both of the above are true
    return result;
};




const outputImage = (img_u8, context, filename) => {
  let imageData = context.getImageData(0, 0, context.canvas.width, context.canvas.height)
  let data_u32 = new Uint32Array(imageData.data.buffer)
  let alpha = (0xff << 24)
  let i = img_u8.cols*img_u8.rows, pix = 0
  while(--i >= 0) {
    pix = img_u8.data[i]
    data_u32[i] = alpha | (pix << 16) | (pix << 8) | pix
  }
  context.putImageData(imageData, 0, 0)
  let imgData = context.canvas.toDataURL().replace(/^data:image\/\w+;base64,/, '')
  //let imageFilePath = path.join(boardPath, 'images', filename)
  fs.writeFileSync(filename, imgData, 'base64')
}



loadWindow()