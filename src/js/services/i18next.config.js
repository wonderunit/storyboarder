let i18n = require('i18next')
let i18nextBackend = require('i18next-fs-backend')
const path = require('path')
const { initReactI18next } = require("react-i18next")
const config = require('./language.config')
let loadPath 
if(window) {
    loadPath = path.join(window.__dirname,  "js/locales/{{lng}}")
} else {
    loadPath = path.join(__dirname, "..", "js/locales/{{lng}}")
}
const i18nextOptions = {
 
    interpolation: {
        escapeValue: false
    },
    saveMissing: true,
    whitelist: config.supportedLanguages,
    lng: config.defaultLanguage,
    supportedLngs: config.supportedLanguages, 
    react: {
        useSuspense: true,
        wait: false
    },
    saveMissingTo: "current",
    fallbackLng: false ,
    backend: {
        loadPath: loadPath + ".json",

        addPath: loadPath + ".missing.json",

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