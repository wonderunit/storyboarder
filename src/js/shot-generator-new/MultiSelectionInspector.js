const { useMemo } = require('react')
const { connect } = require('react-redux')

const h = require('../utils/h')

const {
  getSelections
} = require('../shared/reducers/shot-generator')

const MultiSelectionInspector = connect(
  state => ({
    selectionsCount: getSelections(state).length
  })
)(({ selectionsCount }) => {
  return h(
    ['div', { style: { padding: '24px 6px' } }, `Selected ${selectionsCount} items`]
  )
})

module.exports = MultiSelectionInspector
