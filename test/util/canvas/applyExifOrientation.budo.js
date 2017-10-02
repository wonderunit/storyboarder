// budo test/util/orientation.budo.js --live
// open http://localhost:9966/

const util = require('../../../src/js/utils')
const canvasUtil = require('../../../src/js/utils/canvas')

// via https://github.com/recurser/exif-orientation-examples
let filenames = [
  'Landscape_1.jpg',
  'Landscape_2.jpg',
  'Landscape_3.jpg',
  'Landscape_4.jpg',
  'Landscape_5.jpg',
  'Landscape_6.jpg',
  'Landscape_7.jpg',
  'Landscape_8.jpg',
  'Portrait_1.jpg',
  'Portrait_2.jpg',
  'Portrait_3.jpg',
  'Portrait_4.jpg',
  'Portrait_5.jpg',
  'Portrait_6.jpg',
  'Portrait_7.jpg',
  'Portrait_8.jpg'
]

let loaders = filenames.map(filename => {
  return new Promise((resolve, reject) => {
    let img = new Image()
    img.onload = event => {
      resolve([filename, img])
    }
    img.onerror = event => {
      reject()
    }
    // img.src = 'test/fixtures/images/' + filename
    img.src = `https://github.com/recurser/exif-orientation-examples/raw/9c4ccfa/${filename}`
  })
})

const init = async () => {
  let images = await Promise.all(loaders)

  let index = 0
  for (let [filename, img] of images) {
    let orientation = index + 1

    let canvas = document.createElement('canvas')
    let context = canvas.getContext('2d')

    context.save()
    canvasUtil.applyExifOrientation(context, img, orientation)
    context.restore()

    let div = document.createElement('div')
    div.innerHTML = `${orientation}: ${filename}`
    canvas.style = 'max-width: 100%'
    div.appendChild(canvas)
    document.body.appendChild(div)

    index = (index + 1) % 8
  }
}

init()
