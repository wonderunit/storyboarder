// canvas utils

const adjustmentsForOrientation = (orientation = 1) => {  
  return [
    undefined,

    // 1 left top
    {
      width: [1, 0],
      height: [0, 1],
      rotation: 0,
      scale: [1, 1],
      dx: [0, 0],
      dy: [0, 0],
      dWidth: [1, 0],
      dHeight: [0, 1]
    },

    // 2 top right, horizontal flip
    {
      width: [1, 0],
      height: [0, 1],
      rotation: 0,
      scale: [-1, 1],
      dx: [-1, 0],
      dy: [0, 0],
      dWidth: [1, 0],
      dHeight: [0, 1]
    },

    // 3 right top, 180° rotate left
    {
      width: [1, 0],
      height: [0, 1],
      rotation: Math.PI,
      scale: [1, 1],
      dx: [-1, 0],
      dy: [0, -1],
      dWidth: [1, 0],
      dHeight: [0, 1]
    },

    // 4 left top, vertical flip
    {
      width: [1, 0],
      height: [0, 1],
      rotation: 0,
      scale: [1, -1],
      dx: [0, 0],
      dy: [0, -1],
      dWidth: [1, 0],
      dHeight: [0, 1]
    },

    // 5 top left, vertical flip + 90 rotate right
    {
      width: [0, 1],
      height: [1, 0],
      rotation: Math.PI / -2,
      scale: [-1, 1],
      dx: [0, 0],
      dy: [0, 0],
      dWidth: [1, 0],
      dHeight: [0, 1]
    },

    // 6 top right, 90° rotate right
    {
      width: [0, 1],
      height: [1, 0],
      rotation: Math.PI / 2,
      scale: [1, 1],
      dx: [0, 0],
      dy: [0, -1],
      dWidth: [1, 0],
      dHeight: [0, 1]
    },

    // 7 bottom right, horizontal flip + 90 rotate right
    {
      width: [0, 1],
      height: [1, 0],
      rotation: Math.PI / -2,
      scale: [1, -1],
      dx: [0, 0],
      dy: [0, -1],
      dWidth: [-1, 0],
      dHeight: [0, 1]
    },

    // 8 bottom left, 90° rotate left
    {
      width: [0, 1],
      height: [1, 0],
      rotation: Math.PI / -2,
      scale: [1, 1],
      dx: [0, 0],
      dy: [0, 0],
      dWidth: [-1, 0],
      dHeight: [0, 1]
    }          
  ][orientation]
}

// dot product
const _dot = (a, b) => a[0] * b[0] + a[1] * b[1]

const applyExifOrientation = (context, img, orientation) => {
  let size = [img.naturalWidth, img.naturalHeight]

  let props = adjustmentsForOrientation(orientation)

  // scale
  let canvasWidth   = _dot(size, props.width)
  let canvasHeight  = _dot(size, props.height)
  let dx            = _dot(size, props.dx)
  let dy            = _dot(size, props.dy)
  let dWidth        = _dot(size, props.dWidth)
  let dHeight       = _dot(size, props.dHeight)

  // apply
  context.canvas.width = canvasWidth
  context.canvas.height = canvasHeight
  context.rotate(props.rotation)
  context.scale(...props.scale)
  context.drawImage(img, dx, dy, dWidth, dHeight)
}

module.exports = {
  adjustmentsForOrientation,
  applyExifOrientation
}
