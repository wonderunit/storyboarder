/* global describe it */
const Color = require('color-js')

const util = require('../../src/js/utils/index')

const assert = require('assert')

describe('util', () => {
  it('truncateMiddle', () => {
    let s = '1234567890'
    assert.equal(util.truncateMiddle(s, -1), '1234567890')
    assert.equal(util.truncateMiddle(s, 0), '1234567890')
    assert.equal(util.truncateMiddle(s, 1), '1…')
    assert.equal(util.truncateMiddle(s, 2), '1…0')
    assert.equal(util.truncateMiddle(s, 3), '1…90')
    assert.equal(util.truncateMiddle(s, 4), '12…90')
    assert.equal(util.truncateMiddle(s, 5), '12…890')
    assert.equal(util.truncateMiddle(s, 6), '123…890')
    assert.equal(util.truncateMiddle(s, 7), '123…7890')
    assert.equal(util.truncateMiddle(s, 8), '1234…7890')
    assert.equal(util.truncateMiddle(s, 9), '1234…67890')
    assert.equal(util.truncateMiddle(s, 10), '1234567890')
    assert.equal(util.truncateMiddle(s, 11), '1234567890')
  })

  it('dashed', () => {
    assert.equal(util.dashed('this is some text with spaces'),
      'this-is-some-text-with-spaces')
  })

  it('colorToNumber', () => {
    assert.equal(util.colorToNumber(Color('#ff05ff')), 0xff05ff)
  })

  it('numberToColor', () => {
    assert.equal(Color(util.numberToColor(0xff05ff)).r, Color('#ff05ff').r)
    assert.equal(Color(util.numberToColor(0xff05ff)).g, Color('#ff05ff').g)
    assert.equal(Color(util.numberToColor(0xff05ff)).b, Color('#ff05ff').b)
  })
})
