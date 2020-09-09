let i18n = require('i18next')
let Backend  = require('i18next-http-backend').default
const { initReactI18next } = require("react-i18next")
// TODO(): Make Search folder locales for languages; dynamic instead of static
let builtInLanguages
let request = new XMLHttpRequest()
request.open("GET", "data/customLocales/language-settings.json")
request.addEventListener( 'load', function ( event ) { initializeI18n(this.response) })
request.send( null )
const getLoadPath = (lng, namespace) => {
    let language = lng[0]
    if(builtInLanguages.some((item) => item.fileName === language)) {
        return `data/locales/${lng}.json`
    } else {
        return `data/customLocales/${lng}.json`
    }
}

if(i18n.default) {
    i18n = i18n.default

}
i18n.use(Backend).use(initReactI18next)

const initializeI18n = (settings) => {
    let data = JSON.parse(settings)
    builtInLanguages = data.builtInLanguages
    const i18nextOptions = {
 
        interpolation: {
            escapeValue: false
        },
        lng: data.selectedLanguage,
        react: {
            useSuspense: true,
            wait: false
        },
        load: 'currentOnly',
        fallbackLng: data.defaultLanguage,
        backend: {
            loadPath: getLoadPath,
    
            jsonIdent: 2
        },
    }
    if(!i18n.isInitialized) {
        i18n.init(i18nextOptions)
    }
}


module.exports = i18n