import HandPresetsEditorItem from './HandPresetsEditorItem'
import { NUM_COLS } from './ItemSettings'
import React from 'react'

const ListItem = React.memo(({ data, columnIndex, rowIndex, style }) => {
    let { id, handPosePresetId, updateObject, attachment, thumbnailRenderer, withState, selectedHand } = data
    let preset = data.presets[columnIndex + (rowIndex * NUM_COLS)]
  
    if (!preset) return <div/>
    console.log("render")
    return <HandPresetsEditorItem
        style={ style }
        id={ id }
        handPosePresetId={ handPosePresetId }
        attachment={ attachment } 
        updateObject={ updateObject }
        preset={ preset }
        thumbnailRenderer={ thumbnailRenderer }
        withState={ withState} 
        selectedHand={ selectedHand }/>
})
export default ListItem