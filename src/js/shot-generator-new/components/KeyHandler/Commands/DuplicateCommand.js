import * as THREE from 'three'
const DuplicationCommand = (selections, selectedSceneObject, duplicateObjects) => {
    return { key: "shot-generator:object:duplicate",
            value: () => onCommandDuplicate(selections, selectedSceneObject, duplicateObjects) }
} 

const onCommandDuplicate = (selections, selectedSceneObject, duplicateObjects) => {
    if (selections) {
      let selected = (selectedSceneObject.type === 'group') ? [selectedSceneObject.id] : selections
      // NOTE: this will also select the new duplicates, replacing selection
      duplicateObjects(
        // ids to duplicate
          selected,
        // new ids
          selected.map(THREE.Math.generateUUID)
      )
    }
  }

export default DuplicationCommand