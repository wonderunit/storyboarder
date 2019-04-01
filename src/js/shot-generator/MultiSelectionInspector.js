const { useMemo } = require('react')
const { connect } = require('react-redux')

const h = require('../utils/h')

const MultiSelectionInspector = connect(
  state => ({
    selections: state.selections
  })
)(({ selections }) => {
  return h(
    ['div', { style: { padding: '24px 6px' } }, `Selected ${selections.length} items`]
  )
})

module.exports = MultiSelectionInspector
