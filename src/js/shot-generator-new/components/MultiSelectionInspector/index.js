import React, { useMemo } from 'react'
import { connect } from 'react-redux'

import {
  getSelections
} from '../../../shared/reducers/shot-generator'

const MultiSelectionInspector = connect(
  state => ({
    selectionsCount: getSelections(state).length
  })
)(({ selectionsCount }) => {
  return <div style={{ padding: "24px 6px" }}>Selected {selectionsCount} items</div>
})

export default MultiSelectionInspector
