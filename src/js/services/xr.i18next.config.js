let i18n = require('i18next')
let i18nextBackend = require('i18next-fs-backend')
let Backend  = require('i18next-http-backend').default
const path = require('path')
const { initReactI18next } = require("react-i18next")
const config = require('./language.config')
let loadPath = 'data/locales/{{lng}}'

const i18nextOptions = {
 
    interpolation: {
        escapeValue: false
    },
    whitelist: config.supportedLanguages,
    lng: config.supportedLanguages,
    react: {
        useSuspense: true,
        wait: false
    },
    keySeparator: false,
    fallbackLng: config.defaultLanguage,
    backend: {
        loadPath: loadPath + ".json",

        jsonIdent: 2
    },
}

if(i18n.default) {
    i18n = i18n.default

}
i18n.use(Backend).use(initReactI18next)

if(!i18n.isInitialized) {
    i18n.init(i18nextOptions)
}

module.exports = i18n