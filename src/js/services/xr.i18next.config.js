const i18n = require('i18next').default
const { initReactI18next } = require('react-i18next')

const defaultLocale = require('../../js/locales/en-US.json')

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        translation: {
          ...defaultLocale
        }
      }
    },
    lng: 'en',
    fallbackLng: 'en',

    interpolation: {
      escapeValue: false
    }
  })
  
module.exports = i18n