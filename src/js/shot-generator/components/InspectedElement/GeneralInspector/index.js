import React from 'react'
import {connect} from 'react-redux'

import {
    getSelections,
    getSceneObjects,
    getSelectedBone,
    updateObject,
    updateCharacterSkeleton
} from './../../../../shared/reducers/shot-generator'

import deepEqualSelector from './../../../../utils/deepEqualSelector'

import ObjectInspector from './Object'
import CameraInspector from './Camera'
import ImageInspector from './Image'
import LightInspector from './Light'
import CharacterInspector from './Character'
import VolumeInspector from './Volume'
import Scrollable from '../../Scrollable'

const InspectorComponents = {
  object: ObjectInspector,
  camera: CameraInspector,
  image: ImageInspector,
  light: LightInspector,
  character: CharacterInspector,
  volume: VolumeInspector
}

const GeneralInspector = React.memo(({updateObject, sceneObject, storyboarderFilePath, selectedBone, updateCharacterSkeleton}) => {
  const Component = InspectorComponents[sceneObject.type] ? InspectorComponents[sceneObject.type] : null  

  if (!Component) {
    return null
  }
    
  return (
    <Scrollable>
      <Component
        updateObject={updateObject}
        sceneObject={sceneObject}
        storyboarderFilePath={storyboarderFilePath}
        { ...sceneObject.type === "character" && { 
          updateCharacterSkeleton: updateCharacterSkeleton,
          selectedBone: selectedBone
        }}/>
    </Scrollable>
  )
})

const getObjectData = deepEqualSelector([getSelections, getSceneObjects], (selections, sceneObjects) => {
    return sceneObjects[selections[0]]
})

const mapStateToProps = (state) => ({
  sceneObject: getObjectData(state),
  selectedBone: getSelectedBone(state),
  storyboarderFilePath: state.meta.storyboarderFilePath
})

const mapDispatchToProps = {
    updateObject,
    updateCharacterSkeleton
}

export default connect(mapStateToProps, mapDispatchToProps)(GeneralInspector)
