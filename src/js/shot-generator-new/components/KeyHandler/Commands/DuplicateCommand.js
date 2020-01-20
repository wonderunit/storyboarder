import * as THREE from 'three'
const DuplicationCommand = (selections, selectedSceneObject, duplicateObjects) => {
    return { key: "shot-generator:object:duplicate",
            value: () => onCommandDuplicate(selections, selectedSceneObject, duplicateObjects) }
} 



export default DuplicationCommand