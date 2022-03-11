const assert = require('assert')

const formatMsecs = require('../../../src/js/exporters/pdf/format-msecs.js')

describe('formatMsecs', () => {
  it('formats msecs as a string', () => {
    assert.equal('0:00', formatMsecs(-1))
    assert.equal('0:00', formatMsecs(false))
    assert.equal('0:00', formatMsecs(null))
    assert.equal('0:00', formatMsecs(undefined))
    assert.equal('0:00', formatMsecs(parseInt('x')))
    assert.equal('0:00', formatMsecs(0))
    assert.equal('0:01', formatMsecs(999))
    assert.equal('0:01', formatMsecs(1000))
    assert.equal('0:01', formatMsecs(1001))
    assert.equal('32:15', formatMsecs(1935000))
    assert.equal('59:15', formatMsecs(3555000))
    assert.equal('1:00:00', formatMsecs(3600000))
    assert.equal('1:00:45', formatMsecs(3645000))
    assert.equal('25:00:00', formatMsecs(3600000*25))
  })
})
