
import PosePresetsEditorItem from './PosePresetEditorItem'

const ListItem = React.memo(({ data, columnIndex, rowIndex, style }) => {
    let { id, posePresetId, updateObject, attachments, thumbnailRenderer } = data
    let preset = data.presets[columnIndex + (rowIndex * 4)]
     if (!preset) return <div/>
     return <PosePresetsEditorItem
         style={style}
         id={id}
         posePresetId={posePresetId}
         attachments={attachments}
         updateObject={updateObject}
         preset={preset}
         thumbnailRenderer={thumbnailRenderer}/>
   })
export default ListItem