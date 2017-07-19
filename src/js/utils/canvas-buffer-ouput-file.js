const fs = require('fs')
const { fork } = require('child_process');
const forked = fork(__dirname+'/../files/forked-file-writer.js')

class CanvasBufferOutputFileStrategy {
  constructor(options) {
  }

  flush(buffer, pool) {
    let i = 0;
    while(buffer.length) {
      let bufferData = buffer.splice(0, 1)[0]
      let imageData = bufferData.canvas
        .toDataURL('image/png')
        .replace(/^data:image\/\w+;base64,/, '')
      forked.send({ file: bufferData.metaData, data: imageData, options:'base64' })
      if(pool) {
        pool.push(bufferData.canvas)
      }
    }
  }
}

module.exports = CanvasBufferOutputFileStrategy