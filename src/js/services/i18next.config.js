let i18n = require('i18next')
let i18nextBackend = require('i18next-fs-backend')
let i18nextMiddleware = require('i18next-express-middleware');
const path = require('path')
const { initReactI18next } = require("react-i18next")
let loadPath 
if(window) {
    console.log(window)
    loadPath = path.join(window.__dirname,  "js/locales/{{lng}}.json")
} else {
    loadPath = path.join(__dirname, "..", "js/locales/{{lng}}.json")
}
const i18nextOptions = {
 
    interpolation: {
        escapeValue: false
    },
    saveMissing: true,
    debug:true,
    fallbackLng: "en",
    languages: ["en", "ru"],
    whitelist: ["en", "ru"],
    lng:"en",
    react: {
        useSuspense: true,
        wait: false
    },
    backend: {
        loadPath: loadPath,

        //addPath: "../locales/{{lng}}-{{ns}}.missing.json",

        jsonIdent: 2
    },
}

if(i18n.default) {
    i18n = i18n.default

}
if(i18nextBackend.default) {
    i18nextBackend = i18nextBackend.default
}
i18n.use(i18nextBackend).use(initReactI18next).use(i18nextMiddleware.LanguageDetector)

if(!i18n.isInitialized) {
    i18n.init(i18nextOptions)
    console.log(i18n)
}

module.exports = i18n