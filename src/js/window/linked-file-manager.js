const fs = require('fs-extra')
const path = require('path')

module.exports = class LinkedFileManager {
  constructor ({ storyboarderFilePath }) {
    console.log('new LinkedFileManager', { storyboarderFilePath })
    this.storyboarderFilePath = storyboarderFilePath
    this.linkedFiles = new Map()

    this.addBoard = this.addBoard.bind(this)
    this.onFocus = this.onFocus.bind(this)
  }

  addBoard (board) {
    console.log('LinkedFileManager#addBoard', board)

    let filepath = this.getFilepath(board.link)

    this.linkedFiles.set(board.link, {
      link: board.link,
      filepath: filepath,
      timestamp: this.getTimestamp(filepath)
    })
  }

  removeBoard (board) {
    console.log('LinkedFileManager#removeBoard', board)
    this.linkedFiles.delete(board.link)
  }

  onFocus (board, callbackFn) {
    console.log('LinkedFileManager#onFocus', { event, linkedFiles: this.linkedFiles })

    //
    //
    // to check ALL linked PSDs:
    //
    // for (let [key, linkedFile] of this.linkedFiles) {
    //   this.hasChanged(linkedFile)
    // }

    //
    //
    // to check only the linked PSD of the given board:
    //
    if (this.linkedFiles.has(board.link)) {
      let linkedFile = this.linkedFiles.get(board.link)
      if (this.hasChanged(linkedFile)) {
        console.log('\t', linkedFile.link, 'needs to be updated')
        callbackFn(linkedFile.link)
      } else {
        console.log('\t', linkedFile.link, 'does not need to be updated')
      }
    }
  }

  hasChanged (linkedFile) {
    console.log('LinkedFileManager#hasChanged', { linkedFile })
    return this.getTimestamp(linkedFile.filepath) > linkedFile.timestamp
  }

  getFilepath (filename) {
    return path.join(path.dirname(this.storyboarderFilePath), 'images', filename)
  }
  
  getTimestamp (filepath) {
    console.log('getTimestamp', { filepath })
    return fs.statSync(filepath).mtimeMs
  }

  dispose() {
    this.storyboarderFilePath = null
    this.linkedFiles = null
  }
}

