const util = require('../../src/js/utils/index.js')

const assert = require('assert')

describe('util', () => {
  it('can truncate', () => {
    let s = '1234567890'
    assert.equal(util.truncateMiddle(s, -1), '1234567890');
    assert.equal(util.truncateMiddle(s, 0), '1234567890');
    assert.equal(util.truncateMiddle(s, 1), '1…');
    assert.equal(util.truncateMiddle(s, 2), '1…0');
    assert.equal(util.truncateMiddle(s, 3), '1…90');
    assert.equal(util.truncateMiddle(s, 4), '12…90');
    assert.equal(util.truncateMiddle(s, 5), '12…890');
    assert.equal(util.truncateMiddle(s, 6), '123…890');
    assert.equal(util.truncateMiddle(s, 7), '123…7890');
    assert.equal(util.truncateMiddle(s, 8), '1234…7890');
    assert.equal(util.truncateMiddle(s, 9), '1234…67890');
    assert.equal(util.truncateMiddle(s, 10), '1234567890');
    assert.equal(util.truncateMiddle(s, 11), '1234567890');
  })
})
