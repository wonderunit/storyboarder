
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
        if(!json.byteLength || !json) return
       this.objects = JSON.parse(json)
    }

    _saveFile() {
        let settings = JSON.stringify(this.objects, null, 2)
        fs.writeFileSync(this.settingsFilePath, settings)
    }

    setSettings(values) {
        let keys = Object.keys(values)
        for(let i = 0; i < keys.length; i++){
            let key = keys[i]
            this.objects[key] = values[key]
        }
        this._saveFile()
    }

    setSettingByKey(key, value) {
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