const fs = require('fs')
const GIFEncoder = require('gifencoder')

class CanvasBufferOutputGifStrategy {
  constructor(options) {
    this.filepath = options.filepath || ""
    this.width = options.width || 1600
    this.height = options.height || 900
  }

  flush(buffer, pool) {
    let canvas = document.createElement('canvas')
    canvas.width = this.width
    canvas.height = this.height
    let context = canvas.getContext('2d')
    context.fillStyle = 'white'

    let encoder = new GIFEncoder(this.width, this.height)
    encoder.createReadStream().pipe(fs.createWriteStream(this.filepath))
    encoder.start()
    encoder.setRepeat(0)   // 0 for repeat, -1 for no-repeat
    encoder.setDelay(33)  // frame delay in ms
    let i = 0;
    while(buffer.length) {
      let bufferData = buffer.splice(0, 1)[0]
      context.fillRect(0, 0, this.width, this.height)
      context.drawImage(bufferData.canvas, 0, 0, this.width, this.height)
      encoder.addFrame(context)
      if(pool) {
        pool.push(bufferData.canvas)
      }
    }
    
    encoder.finish()
  }
}

module.exports = CanvasBufferOutputGifStrategy