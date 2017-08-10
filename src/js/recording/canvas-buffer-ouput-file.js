const fs = require('fs')
const path = require('path')
const { fork } = require('child_process');
const forked = fork(__dirname+'/../files/forked-file-writer.js')

class CanvasBufferOutputFileStrategy {
  constructor(options) {
    this.exportsPath = options.exportsPath
  }

  flush(buffer, pool) {
    return new Promise((fulfill, reject) => {
      let i = 0;
      let result = []
      while(buffer.length) {
        let bufferData = buffer.splice(0, 1)[0]
        let filepath = path.join(this.exportsPath, `${bufferData.metaData.filename}-${bufferData.metaData.frameNum}.png`)
        result.push(filepath)
        let imageData = bufferData.canvas
          .toDataURL('image/png')
          .replace(/^data:image\/\w+;base64,/, '')
        forked.send({ file: filepath, data: imageData, options:'base64' })
        if(pool) {
          pool.push(bufferData.canvas)
        }
      }
      fulfill(result)
    })
  }
}

module.exports = CanvasBufferOutputFileStrategy