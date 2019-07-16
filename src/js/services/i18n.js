// TODO pre-compiled templates for better performance
// TODO smarter init

const path = require('path')
const fs = require('fs')

const log = require('electron-log')
log.catchErrors()

const electron = require('electron')
const app = electron.app ? electron.app : electron.remote.app

const IntlMessageFormat = require('intl-messageformat')

const localesPath = path.join(__dirname, '..', '..', 'locales')

let locale

const init = ({ localeName }) => {
  let localePath = path.join(localesPath, `${localeName}.json`)
  let defaultLocalePath = path.join(localesPath, `en-US.json`)
  try {
    if (fs.existsSync(localePath)) {
      locale = JSON.parse(fs.readFileSync(localePath, 'utf8'))
    } else {
      locale = JSON.parse(fs.readFileSync(defaultLocalePath, 'utf8'))
    }
  } catch (err) {
    log.error(err)
  }
}

const t = (key, values) =>
  locale[key]
    ? new IntlMessageFormat(locale[key], app.getLocale()).format(values)
    : key

if (!locale) init({ localeName: app.getLocale() })

module.exports = {
  init,
  t
}
