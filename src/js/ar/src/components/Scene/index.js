import React, {useState, useContext} from 'react'
import {connect} from "react-redux"
import {useFrame} from "react-three-fiber"

import {SGConnection} from "../../helpers/store"

import {getSceneObjects, getWorld} from "../../../../shared/reducers/shot-generator"
import {SceneState} from "../../helpers/sceneState"

import {useThreeFrameProvider, useThreeStateProvider} from "../../hooks/useThreeHooks"

import Environment from "../Three/Environment"
import Model from "../Three/Model"
import Image from "../Three/Image"
import Light from "../Three/Light"
import VirtualCamera from "../Three/VirtualCamera"
import Character from "../Three/Character"
import Background from "../Three/Background"
import Ground from "../Three/Ground"
import useHitTestManager from "../../hooks/useHitTestManager"


const componentMap = {
  object: Model,
  image: Image,
  light: Light,
  camera: VirtualCamera,
  character: Character
}

const renderObject = (sceneObject) => {
  const Component = componentMap[sceneObject.type]
  if (Component) {
     return <Component id={sceneObject.id} key={sceneObject.id}/>
  }
  
  return null
}

const Scene = ({sceneObjects, world}) => {
  const [currentSceneState, setSceneState] = useContext(SceneState)
  const [sceneVisible, setSceneVisible] = useState(true)

  useFrame(({camera}) => {
    SGConnection.sendInfo({
      matrix: camera.matrixWorld.toArray(),
      controllers: []
    })
  })

  useThreeFrameProvider()
  useThreeStateProvider()

  useHitTestManager(currentSceneState.selectEnabled)
  
  return (
    <group
      rotation={[0, currentSceneState.rotation, 0]}
    >
      <group
          position={[0, -1.0, 0]}
      >
        <group
          position={currentSceneState.position}
          scale={[currentSceneState.scale, currentSceneState.scale, currentSceneState.scale]}
          visible={sceneVisible}
        >
          <Background/>
          <Ground/>
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
    </group>
  )
}

const mapStateToProps = (state) => ({
  sceneObjects: getSceneObjects(state),
  world: getWorld(state)
})

export default connect(mapStateToProps)(Scene)
