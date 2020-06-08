import React, {useRef, useState} from 'react'
import {connect} from "react-redux"

import {useController, useHitTestManager} from "../../hooks/useController"
import {getSceneObjects, getWorld} from "../../../../shared/reducers/shot-generator"
import Environment from "../Three/Environment"
import Model from "../Three/Model"
import Image from "../Three/Image"
import Light from "../Three/Light"
import VirtualCamera from "../Three/VirtualCamera"
import Character from "../Three/Character"

const componentMap = {
  object: Model,
  image: Image,
  light: Light,
  camera: VirtualCamera,
  //character: Character
}

const renderObject = (sceneObject) => {
  const Component = componentMap[sceneObject.type]
  if (Component) {
     return <Component id={sceneObject.id} key={sceneObject.id}/>
  }
  
  return null
}

const Scene = ({sceneObjects, world, placingEnabled = true, sceneState}) => {
  const [sceneVisible, setSceneVisible] = useState(false)
  const meshRef = useRef(null)

  useController(({reticle}) => {
    if (!placingEnabled) {
      return false
    }
    
    meshRef.current.position.setFromMatrixPosition(reticle.matrix)
    meshRef.current.quaternion.setFromRotationMatrix(reticle.matrix)
    meshRef.current.updateWorldMatrix(false, true)
    
    if (!sceneVisible) {
      setSceneVisible(true)
    }
  }, [placingEnabled])

  useHitTestManager(placingEnabled)
  
  return (
    <group
      ref={meshRef}
      position={sceneState[0].position}
      scale={sceneState[0].scale}
      visible={sceneVisible}
    >
      <ambientLight
        color={ 0xffffff }
        intensity={ world.ambient.intensity }
      />
      <directionalLight
        color={ 0xffffff }
        intensity={ world.directional.intensity }
        position={ [0, 1.5, 0] }
        target-position={ [0, 0, 0.4] }
      />
      <Environment/>
      {Object.values(sceneObjects).map(renderObject)}
    </group>
  )
}

const mapStateToProps = (state) => ({
  sceneObjects: getSceneObjects(state),
  world: getWorld(state)
})

export default connect(mapStateToProps)(Scene)
