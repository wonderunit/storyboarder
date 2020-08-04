let i18n = require('i18next')
let Backend  = require('i18next-http-backend').default
const { initReactI18next } = require("react-i18next")

// TODO(): Make Search folder locales for languages; dynamic instead of static
let supportedLanguages = ['en-US', 'ru-RU', 'test']
let defaultLanguage = 'en-US'

const getLoadPath = (lng, namespace) => {
    let language = lng[0]
    if(supportedLanguages.includes(language)) {
        return `data/locales/${lng}.json`
    } else {
        return `data/customLocales/${lng}.json`
    }
}

const i18nextOptions = {
 
    interpolation: {
        escapeValue: false
    },
    lng: defaultLanguage,
    react: {
        useSuspense: true,
        wait: false
    },
    fallbackLng: defaultLanguage,
    backend: {
        loadPath: getLoadPath,

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