const { useMemo } = require('react')
const { connect } = require('react-redux')

const h = require('../utils/h')

const {
  getSelections
} = require('../shared/reducers/shot-generator')

const MultiSelectionInspector = connect(
  state => ({
    selections: getSelections(state)
  })
)(({ selections, count }) => {
  return h(
    ['div', { style: { padding: '24px 6px' } }, `Selected ${count} items`]
  )
})

module.exports = MultiSelectionInspector
