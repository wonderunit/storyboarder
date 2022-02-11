const fs = require('fs')
const path = require('path')
const app = require('@electron/remote').app
const os = require("os");

let prefs
let isLoaded = false
let userDataPath

const init = () => {
  userDataPath = app.getPath('userData')
}

const getData = (filename) => {
  return new Promise((resolve, reject)=>{
    let filepath = path.join(userDataPath, filename)
    fs.readFile(filepath, (error, file) => {
      if(error) {
        return reject(error)
      }
      let result
      try {
        result = JSON.parse(file)
      } catch(e) {
        return reject(e)
      }
      return resolve(result)
    })
  })
}

const saveData = (filename, data) => {
  return new Promise((resolve, reject)=>{
    let filepath = path.join(userDataPath, filename)
    fs.writeFile(filepath, JSON.stringify(data, null, 2), (error)=>{
      if(error) {
        return reject(error)
      }
      return resolve()
    })
  })
}

init()

module.exports = {
  getData,
  saveData,
  init
}
