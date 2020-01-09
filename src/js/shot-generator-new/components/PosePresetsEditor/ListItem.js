
import PosePresetsEditorItem from './PosePresetEditorItem'
import React from 'react'

const ListItem = React.memo(({ data, columnIndex, rowIndex, style }) => {
    let { id, posePresetId, updateObject, attachment, thumbnailRenderer } = data
    let preset = data.presets[columnIndex + (rowIndex * 4)]
     if (!preset) return <div/>
     return <PosePresetsEditorItem
         style={ style }
         id={ id }
         posePresetId={ posePresetId }
         attachment={ attachment }
         updateObject={ updateObject }
         preset={ preset }
         thumbnailRenderer={ thumbnailRenderer }/>
   })
export default ListItem