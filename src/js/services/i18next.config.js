let i18n = require('i18next')
let i18nextBackend = require('i18next-fs-backend')
const Electron = require('electron')
const electronApp = Electron.app ? Electron.app : Electron.remote.app
const userDataPath = electronApp.getPath('userData')
const path = require('path')
const { initReactI18next } = require("react-i18next")
const {settings:config} = require('./language.config')
let loadPath 
if(window) {
    loadPath = path.join(window.__dirname, "js", "locales")
} else {
    loadPath = path.join(__dirname, "..", "js", "locales")
}
const getLoadPath = (lng, namespace) => {
    let builtInPath = path.join(loadPath, `${lng}.json`)
    if(config.getSettingByKey("builtInLanguages").some((item) => item.fileName === lng)) {
        return builtInPath
    } else {
        return path.join(userDataPath, "locales", `${lng}.json`)
    }
}

const i18nextOptions = {
 
    interpolation: {
        escapeValue: false
    },

    lng: config.getSettingByKey('selectedLanguage'),
    react: {
        useSuspense: true,
        wait: false
    },
    fallbackLng:  config.getSettingByKey('defaultLanguage'),
    backend: {
        loadPath: getLoadPath,

        jsonIdent: 2
    },
}

if(i18n.default) {
    i18n = i18n.default

}
if(i18nextBackend.default) {
    i18nextBackend = i18nextBackend.default
}
i18n.use(i18nextBackend).use(initReactI18next)

if(!i18n.isInitialized) {
    i18n.init(i18nextOptions)
}

module.exports = i18n