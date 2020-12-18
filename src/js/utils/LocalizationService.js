const { ipcRenderer, remote } = require('electron')
const i18n = require('../services/i18next.config')
const menu = require('../menu')
class LocalizationService {
    constructor(updateMethod) {
        this._updateTranslation = () => updateMethod(i18n) 
        remote.getCurrentWindow().on('focus', () => this._onFocus)
        i18n.on('loaded', () => this._onLoaded())
        ipcRenderer.on("languageChanged", (event, lng) => this._onLanguageChanged(event, lng))
        ipcRenderer.on("languageModified", (event, lng) => this._onLanguageModified(event, lng))
        ipcRenderer.on("languageAdded", (event, lng) => this._onLanguageAdded(event, lng))
        ipcRenderer.on("languageRemoved", (event, lng) => this._onLanguageRemoved(event, lng))
    }

    _onFocus () {
        menu.setWelcomeMenu(i18n)
    }

    _onLoaded () {
        let lng = ipcRenderer.sendSync("getCurrentLanguage")
        this._updateTranslation()
        i18n.changeLanguage(lng, () => {
          i18n.on("languageChanged", this.changeLanguage)
          this._updateTranslation()
        })
        i18n.off('loaded')
    }

    _onLanguageChanged (event, lng) {
        i18n.off("languageChanged", this.changeLanguage)
        i18n.changeLanguage(lng, () => {
          i18n.on("languageChanged", this.changeLanguage)
          this._updateTranslation()
        })
    }

    _onLanguageModified (event, lng) {
        i18n.reloadResources(lng).then( () => { this._updateTranslation() } )
    }

    _onLanguageAdded (event, lng) {
        i18n.loadLanguages(lng).then(() => { i18n.changeLanguage(lng); })
    }

    _onLanguageRemoved (event, lng) {
        i18n.changeLanguage(lng)
    }

    changeLanguage (lng) {
        if(remote.getCurrentWindow().isFocused()) {
          menu.setWelcomeMenu(i18n)
        }
        this._updateTranslation()
        ipcRenderer.send("languageChanged", lng)
    }
}

module.exports = LocalizationService

