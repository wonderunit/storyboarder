const fs = require('fs')
const os = require('os')
const path = require('path')
const { app, session } = electron = require('electron')
const util = require('./utils')
const pkg = require('../../package.json')

const Analytics = require('electron-google-analytics').default
const analytics = new Analytics('UA-101546881-2')

const uuidFile = path.join(app.getPath('userData'), 'uuid.txt')

let uuid

let ses

// TODO ADD EXCEPTION TRACKING
// hit type: exception
// screen resolution
// pen vs mouse
// keyboard vs nav buttons
// ping


let enabled = true

const init = shouldEnable => {
  enabled = shouldEnable
  if (!enabled) return

  ses = session.fromPartition('persist:name')
  // get the UUID from file
  fs.readFile(uuidFile, "utf8", (err, data) => {
    if (err) {
      uuid = util.uuid4()
      fs.writeFile(uuidFile, uuid, (err) => {
        if (err) {
          console.log('There was a problem saving the UUID file')
        } else {
          console.log('A new UUID file has been saved!')
        }
      })
    } else {
      uuid = data
    }

    let { width, height } = electron.screen.getPrimaryDisplay().workAreaSize

    analytics.send('event', {
      ec: 'Application', 
      ea: 'start', 
      an: pkg.name,
      av: pkg.version,
      sr: width + 'x' + height,
      sc: 'start',
      ua: ses.getUserAgent(),
      cd1: os.arch(),
      cd2: os.platform(),
      cd3: os.type(),
      cd4: os.release(),
      cd5: os.totalmem(),
      cd6: os.cpus().length,
      cd7: os.cpus()[0].speed,
    }, uuid)
  })
}

const screenView = (screenName) => {
  if (!enabled) return

  analytics.send('screenview', {
    cd: screenName,
    an: pkg.name,
    av: pkg.version,
    ua: ses.getUserAgent(),
  }, uuid)
}

const event = (category, action, label, value) => {
  if (!enabled) return
  let params = {
    ec: category,
    ea: action,
    ua: ses.getUserAgent(),
  }
  if (label) { params.el = label }
  if (value) { params.ev = value }

  if (action == 'quit') {
    params.sc = 'end'
  }

  analytics.send('event', params, uuid)
}

const timing = (category, name, ms) => {
  if (!enabled) return

  let params = {
    utc: category, 
    utv: name, 
    utt: Math.round(ms),
  }

  analytics.send('timing', params, uuid)
}

const exception = (error, url, line) => {
  if (!enabled) return

  let params = {
    exd: error.substring(0,30) + ' | ' + url.substring(url.length - 30) + ' | ' + line
    an: pkg.name,
    av: pkg.version,
    sr: width + 'x' + height,
    ua: ses.getUserAgent(),
  }

  analytics.send('exception', params, uuid)
}

const ping = () => {
  if (!enabled) return

  let params = {
    ec: 'Ping',
    ea: 'ping',
    ua: ses.getUserAgent(),
    ni: 0
  }

  analytics.send('event', params, uuid)
}

module.exports = {
  init,
  screenView,
  event,
  timing,
  exception,
  ping,
}