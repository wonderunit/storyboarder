/* global describe it */

// USAGE npx electron-mocha --renderer test/models/license.renderer.test.js

const { machineIdSync } = require('node-machine-id')

const assert = require('assert')
const nock = require('nock')
const nodeFetch = require('node-fetch') // because nock doesn’t work with fetch in electron-mocha

const JWT = require('jsonwebtoken')

const { VERIFICATION_URL, checkLicense } = require('../../src/js/models/license')

// use node-fetch as the fetcher in our tests so that we can use nock
let modified = {
  checkLicense: (license, options) => checkLicense(license, { ...options, fetcher: nodeFetch })
}

describe('license', () => {
  let testMachineId = machineIdSync({ original: true })
  let now = () => Date.now().valueOf() / 1000
  let validLicenseToken

  beforeEach(() => {
    nock.disableNetConnect()

    validLicenseToken = JWT.sign({
      licenseExpiration: now() + 1000,
      machineId: testMachineId
    }, 'test-secret')
  })

  afterEach(() => {
    nock.cleanAll()
    nock.enableNetConnect()
  })

  describe('with basic server approval', () => {
    let scope

    beforeEach(() => {
      scope = nock(VERIFICATION_URL.origin)
        .post(VERIFICATION_URL.pathname)
        .reply(200)
    })

    it('can be checked', async () => {
      assert.equal(true, await modified.checkLicense(validLicenseToken))
    }).timeout(0)

    it('requires a license object', async () => {
      assert.equal(false, await modified.checkLicense({}))
    })

    it('requires a matching machine id', async () => {
      assert.equal(false, await modified.checkLicense({
        ...validLicenseToken,
        machineId: 'fake id',
      }))
    })

    it('requires a fresh expiration date', async () => {
      assert.equal(false, await modified.checkLicense({
        ...validLicenseToken,
        licenseExpiration: now() - 10000,
      }))
    })
  })

  describe('server checks', () => {
    let scope

    it('assuming server can be reached, fails if server does not approve', async () => {
      let scope = nock(VERIFICATION_URL.origin)
        .post(VERIFICATION_URL.pathname)
        .reply(422)
      assert.equal(false, await modified.checkLicense(validLicenseToken))
      scope.done()
    })

    it('passes anyway if server times out', async () => {
      let scope = nock(VERIFICATION_URL.origin)
        .post(VERIFICATION_URL.pathname)
        .delay(30000)
        .reply(500)
    
      assert(await modified.checkLicense(validLicenseToken, { timeoutInMsecs: 250 }))
    }).timeout(0)

    it('passes anyway if server is inaccessible', async () => {
      // TODO replace with simpler assert.rejects (only available in node v10.0.0+)
      try {
        await nodeFetch(VERIFICATION_URL.toString())
        assert.fail()
      } catch (err) {
        console.error(err)
        assert(err.code === 'ENETUNREACH')
      }
      assert(await modified.checkLicense(validLicenseToken))
    }).timeout(0)
  })
})
