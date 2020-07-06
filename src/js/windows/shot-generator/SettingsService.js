
const fs = require('fs-extra')
class SettingsService {

    //NOTE() : Filepath should be absolute path to file
    constructor(filepath) {
        this.settingsFilePath = filepath 
        this.objects = {}
        this._loadFile()
    }
    
    _loadFile() {
        fs.ensureFileSync(this.settingsFilePath)
        let json = fs.readFileSync(this.settingsFilePath)
        if(!json.byteLength) return
        this.objects = JSON.parse(json)
    }

    _saveFile() {
        let settings = JSON.stringify(this.objects, null, 2)
        fs.writeFile(this.settingsFilePath, settings)
    }

    setSettings(values) {
        let keys = Object.keys(values)
        for(let i = 0; i < keys.length; i++){
            let key = keys[i]
            this.objects[key] = values[key]
        }
        this._saveFile()
    }

    setSettingsByKey(key, value) {
        this.objects[key] = value
        this._saveFile()
    }

    getSettings() {
        return this.objects
    }
    
    getSettingByKey(name) {
        return this.objects[name]
    }
}

module.exports = SettingsService