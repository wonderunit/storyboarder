const assert = require('assert')

const i18n = require('../../src/js/services/i18n.js')

describe('i18n', () => {
  it('can interpolate', () => {
    assert(
      i18n.t('shot-generator.toolbar.open-in-vr.message', { xrServerUrl: 'INTERPOLATED' } ).match('INTERPOLATED')
    )
  })
  it('has a fall-back', () => {
    assert.equal(
      i18n.t('shot-generator.does-not-exist-even-for-testing'),
      'shot-generator.does-not-exist-even-for-testing'
    )
  })
})
