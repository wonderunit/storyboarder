
import fs from 'fs-extra'
import path from 'path'
import electron from 'electron'
const { app } = electron.remote
let objects = {
    zoom: 0
}
let isLoaded = false
const settingsFilePath = path.join(app.getPath('userData'), 'shot-generator-settings.json')
const loadFile = () => {
    fs.ensureFileSync(settingsFilePath)
    let json = fs.readFileSync(settingsFilePath)
    isLoaded = true;
    if(!json.byteLength) return
    objects = JSON.parse(json)
}

const saveFile = () => {
    let settings = JSON.stringify(objects, null, 2)
    fs.writeFileSync(settingsFilePath, settings)
}

const updateObjects = (value) => {
    if(!isLoaded) loadFile()
    objects.zoom = value.zoom
    saveFile()
}

const getObject = (name) => {
    if(!isLoaded) loadFile()
    return objects[name]
}

export {
    updateObjects,
    getObject
}