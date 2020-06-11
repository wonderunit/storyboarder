import React, {useState, useContext} from 'react'
import {connect} from "react-redux"
import {useUpdate} from "react-three-fiber"

import {useHitTestManager, useController} from "../../hooks/useHitTestManager"
import {getSceneObjects, getWorld} from "../../../../shared/reducers/shot-generator"
import {SceneState} from "../../helpers/sceneState"

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

const Scene = ({sceneObjects, world, placingEnabled = true}) => {
  const [currentSceneState, setSceneState] = useContext(SceneState)
  
  const [sceneVisible, setSceneVisible] = useState(false)

  const sceneRef = useUpdate(() => {
    sceneRef.current.matrixWorld.fromArray(currentSceneState.currentMatrix)

    sceneRef.current.position.setFromMatrixPosition(sceneRef.current.matrixWorld)
    sceneRef.current.quaternion.setFromRotationMatrix(sceneRef.current.matrixWorld)
    sceneRef.current.updateWorldMatrix(false, true)
    
    if (!sceneVisible && !currentSceneState.positioningEnabled) {
      setSceneVisible(true)
    }
  }, [currentSceneState.currentMatrix, currentSceneState.positioningEnabled])

  useHitTestManager(placingEnabled)
  
  return (
    <group
      ref={sceneRef}
    >
      <group
        position={currentSceneState.position}
        scale={currentSceneState.scale}
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
    </group>
  )
}

const mapStateToProps = (state) => ({
  sceneObjects: getSceneObjects(state),
  world: getWorld(state)
})

export default connect(mapStateToProps)(Scene)
