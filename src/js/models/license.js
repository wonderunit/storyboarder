const { machineIdSync } = require('node-machine-id')

const fetchWithTimeout = require('../../../src/js/utils/fetchWithTimeout')
const pkg = require('../../../package.json')

const JWT = require('jsonwebtoken')

// renderer has `URL`, but main (node) does not
// so we fake it
// const VERIFICATION_URL = new URL('http://localhost:8080/api/check_license')
const VERIFICATION_URL = {
  origin: 'http://localhost:8080',
  pathname: '/api/check_license',
  toString() {
    return `${this.origin}${this.pathname}`
  }
}

async function checkLicense (
  token,
  options = {}
) {
  let defaultOptions = {
    verificationUri: VERIFICATION_URL.toString(),
    userAgent: `Storyboarder/${pkg.version}`,
    timeoutInMsecs: 10000,
    fetcher: global.fetch
  }
  options = { ...defaultOptions, ...options }
  try {
    let license = JWT.decode(token)

    // is there a license object?
    if (license) {
      // get expectedMachineId
      let expectedMachineId = machineIdSync({
        // compare original values (not SHA-256'd)
        original: true
      })

      // does the license machineId match the expected machineId?
      if (
        // machineId is a string
        typeof license.machineId === 'string' &&
        // machineId is not empty
        license.machineId.length > 4 &&
        // they are an exact match
        license.machineId === expectedMachineId
      ) {
        // is the token still fresh?
        if (
          license.licenseExpiration == null ||
          license.licenseExpiration >= Date.now().valueOf() / 1000
        ) {
          // try checking the server
          // if valid, continue
          try {
            let response = await fetchWithTimeout(
              options.verificationUri,
              {
                method: 'POST',
                cache: 'no-cache',
                headers: {
                  'User-Agent': options.userAgent,
                  'Content-Type': 'application/json; charset=utf-8',
                },
                body: JSON.stringify({ token })
              },
              options.timeoutInMsecs,
              options.fetcher
            )
            if (response.status === 200) {
              console.log('license check ok')
              return true
            } else {
              console.log('license check failed: invalidated by server')
              console.log(await response.text())
              return false
            }

          } catch (err) {
            if (
              err.code === 'ECONNREFUSED' ||
              err.code === 'ENETUNREACH'
            ) {
              console.log('license check: server unreachable')
              return true

            } else if (err.message === 'Request timed out') {
              console.log('license check: request timed out')
              return true

            } else {
              console.log('license check: server error')

              console.log(err.stack)
              console.log('code:', err.code)
              console.log('message', err.message)

              // TODO why does electron-mocha not print an error string here?
              // to see error: npx floss -d -p test/models/license.renderer.test.js
              console.error(err)

              return true
            }
          }
        } else {
          console.log('license check failed: expired')
          return false
        }
      } else {
        console.log('license check failed: machine id mis-match')
        return false
      }
    } else {
      console.log('license check failed: no license')
      return false
    }
  } catch (err) {
    console.log('license check failed: unexpected error')
    console.log(err)
    console.error(err)
    return false
  }
}

module.exports = {
  VERIFICATION_URL,
  checkLicense
}
