const fs = require('fs-extra')
const path = require('path')

module.exports = class LinkedFileManager {
  constructor ({ storyboarderFilePath }) {
    console.log('new LinkedFileManager', { storyboarderFilePath })
    this.storyboarderFilePath = storyboarderFilePath
    this.linkedFiles = new Map()

    this.addBoard = this.addBoard.bind(this)
    this.activateBoard = this.activateBoard.bind(this)
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

  async activateBoard (board, callbackFn) {
    console.log('LinkedFileManager#activateBoard')

    //
    //
    // to check ALL linked PSDs:
    //
    // for (let [key, linkedFile] of this.linkedFiles) {
    //   this.getChangeTime(linkedFile)
    // }

    //
    //
    // to check only the linked PSD of the given board:
    //
    if (this.linkedFiles.has(board.link)) {
      let linkedFile = this.linkedFiles.get(board.link)
      let timestamp = this.getChangeTime(linkedFile)
      if (timestamp !== false) {
        console.log('\t', linkedFile.link, 'needs to be updated')
        await callbackFn(linkedFile.link)
        linkedFile.timestamp = timestamp
        return true
      } else {
        console.log('\t', linkedFile.link, 'does not need to be updated')
        return false
      }
    }
  }

  getChangeTime (linkedFile) {
    console.log('LinkedFileManager#getChangeTime', { linkedFile })
    let timestamp = this.getTimestamp(linkedFile.filepath)
    if (timestamp > linkedFile.timestamp) {
      return timestamp
    } else {
      return false
    }
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

