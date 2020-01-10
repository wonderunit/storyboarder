import React from 'react'
import {connect} from 'react-redux'

import {
    getSelections,
    getSceneObjects,

    updateObject
} from './../../../shared/reducers/shot-generator'

import deepEqualSelector from './../../../utils/deepEqualSelector'

import ObjectInspector from './Objects/Object'
import CameraInspector from './Objects/Camera'
import ImageInspector from './Objects/Image'
import LightInspector from './Objects/Light'
import CharacterInspector from './Objects/Character'
import VolumeInspector from './Objects/Volume'

const InspectorComponents = {
  object: ObjectInspector,
  camera: CameraInspector,
  image: ImageInspector,
  light: LightInspector,
  character: CharacterInspector,
  volume: VolumeInspector
}

const GeneralInspector = React.memo(({updateObject, sceneObject, storyboarderFilePath}) => {
  const Component = InspectorComponents[sceneObject.type] ? InspectorComponents[sceneObject.type] : null  

  if (!Component) {
    return null
  }
    
  return (
    <div>
      <Component
        updateObject={updateObject}
        sceneObject={sceneObject}
        storyboarderFilePath={storyboarderFilePath}
      />
    </div>
  )
})

const getObjectData = deepEqualSelector([getSelections, getSceneObjects], (selections, sceneObjects) => {
    return sceneObjects[selections[0]]
})

const mapStateToProps = (state) => ({
  sceneObject: getObjectData(state),
  storyboarderFilePath: state.meta.storyboarderFilePath
})

const mapDispatchToProps = {
    updateObject
}

export default connect(mapStateToProps, mapDispatchToProps)(GeneralInspector)