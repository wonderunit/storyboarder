
import ModelFileItem from '../ModelFileItem'
import React from 'react'
import * as ItemSettings from '../../utils/InspectorElementsSettings'

const ListItem = React.memo(({ data, columnIndex, rowIndex, style }) => {
    const { sceneObject } = data
    const model = data.models[columnIndex + (rowIndex * ItemSettings.NUM_COLS)]
    const onSelectItem = data.onSelectItem

    if (!model) return <div/>
    return <ModelFileItem
        id={ sceneObject.id }
        style={ style }
        model={ model }
        isSelected={ sceneObject.model === model.id }
        onSelectItem={ onSelectItem }
        itemSettings={ ItemSettings } />
  })
  export default ListItem