const fs = require('fs')
const GIFEncoder = require('gifencoder')
const { getImage } = require('../exporters/common')

class CanvasBufferOutputGifStrategy {
  constructor(options) {
    this.filepath = options.filepath || ""
    this.width = options.width || 400
    this.height = options.height || 225
  }

  flush(buffer, pool) {
    let canvas = document.createElement('canvas')
    canvas.width = this.width
    canvas.height = this.height
    let context = canvas.getContext('2d')
    context.fillStyle = 'white'
    let encoder = new GIFEncoder(this.width, this.height)
    encoder.start()
    encoder.setRepeat(0)   // 0 for repeat, -1 for no-repeat

    let writeGif = (watermarkImage) => {
      let i = 0;
      while(buffer.length) {
        encoder.setDelay(100)  // frame delay in ms
        let bufferData = buffer.splice(0, 1)[0]
        context.fillRect(0, 0, this.width, this.height)
        context.drawImage(bufferData.canvas, 0, 0, this.width, this.height)
        if(watermarkImage) {
          context.drawImage(watermarkImage, this.width-watermarkImage.width, this.height-watermarkImage.height)
        }
        if(bufferData.metaData.duration) {
          encoder.setDelay(bufferData.metaData.duration)
        }
        if(buffer.length === 0) { // hold on the last frame for a second.
          encoder.setDelay(2000)
        }
        encoder.addFrame(context)
        if(pool) {
          pool.push(bufferData.canvas)
        }
      }
      
      encoder.finish()

      var buf = encoder.out.getData();
      return new Promise((resolve, reject)=>{
        fs.writeFile(this.filepath, buf, function (error) {
          if(error) {
            console.log(error)
            return reject(error)
          }
          return resolve()
        });
      })
    }

    return new Promise((fulfill, reject)=>{
      getImage('./img/watermark.png')
        .then( (watermarkImage) => {
          writeGif(watermarkImage)
            .then(() => fulfill([this.filepath]))
            .catch(error => reject(error))
        })
        .catch( error => { 
          console.error(error) 
          writeGif(watermarkImage)
            .then(() => fulfill([this.filepath]))
            .catch(error => reject(error))
        })
    })

  }
}

module.exports = CanvasBufferOutputGifStrategy