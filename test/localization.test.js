const assert = require('assert')

//const i18n = require('../../src/js/services/i18n.js')
const path = require("path")
const i18next = require('i18next')
const Backend = require('i18next-fs-backend')
// const sinon = require('sinon')

describe('i18n', () => {
  beforeEach((done) => {
    i18next
      .use(Backend)
      .init({
        lng: 'en',
        fallbackLng: {
          'en-US': ['en'],
          'ru-RU': ['ru'],
        },
        debug: true,
        backend: {
          loadPath: path.join(__dirname, '..', 'src/js/locales/{{lng}}.json'),
          addPath: path.join(__dirname, '..', 'src/js/locales/{{lng}}.missing.json'),
          jsonIndent: 2
        }
      }, function (err, t) {
        if (err) {
          console.log(err)
          console.error(err.stack)
          done(err)
          return
        }
        done()
      })
  })
  it('formats remaining seconds into correct format', function () {
    assert.equal(i18next.t("Language"), "Language")
  })
})
