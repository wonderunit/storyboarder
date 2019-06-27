/* global describe it */
const sortFilePaths = require('../../src/js/utils/sortFilePaths')
const assert = require('assert')

describe('sortFilePaths', () => {
  const asAbsolutePath = filename => `/path/2019/06/${filename}`

  const check = (a, b) => {
    assert.deepStrictEqual(sortFilePaths(a), b)
    assert.deepStrictEqual(sortFilePaths(a.map(asAbsolutePath)), b.map(asAbsolutePath))
  }

  it('1', () =>
    check(
      ['1.jpg', '11.jpg', '2.jpg'],
      ['1.jpg', '2.jpg', '11.jpg']
    )
  )

  it('001', () =>
    check(
      ['001.jpg', '011.jpg', '002.jpg'],
      ['001.jpg', '002.jpg', '011.jpg']
    )
  )

  it('boards', () => {
    check(
      ['board-1-123ABC.jpg', 'board-3-ABC123.jpg', 'board-2-923ABC.jpg'],
      ['board-1-123ABC.jpg', 'board-2-923ABC.jpg', 'board-3-ABC123.jpg']
    )
  })
})
