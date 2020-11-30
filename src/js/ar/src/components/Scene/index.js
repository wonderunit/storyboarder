import React, {useState, useContext, useRef, useEffect} from 'react'
import {connect} from "react-redux"
import {useFrame, useThree} from "react-three-fiber"

import {Connection} from "../../helpers/store"

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

const renderObject = (sceneObject, getAsset) => {
  const Component = componentMap[sceneObject.type]
  if (Component) {
     return <Component id={sceneObject.id} key={sceneObject.id} getAsset={getAsset}/>
  }
  
  return null
}

let tmpPos = new THREE.Vector3()
let tmpScale = new THREE.Vector3()
let tmpRot = new THREE.Quaternion()

let tmpRotVector = new THREE.Vector3(0.0, 0.0, 0.0)
let angle = 0

const Scene = ({sceneObjects, world, getAsset}) => {
  const [currentSceneState, setSceneState] = useContext(SceneState)
  const [sceneVisible, setSceneVisible] = useState(true)

  const {camera} = useThree()

  const rotationRef = useRef(null)
  const positionRef = useRef(null)

  useFrame((state, delta) => {
    // As use frame is an async function then ref has been already declared
    if (currentSceneState.movement.left) {

      rotationRef.current.rotation.y -= delta;
    } else if (currentSceneState.movement.right) {

      rotationRef.current.rotation.y += delta;
    } else if (currentSceneState.movement.top) {

      tmpRotVector.set(camera.matrixWorld.elements[8], 0.0, camera.matrixWorld.elements[10])
      angle = Math.atan2(tmpRotVector.x, tmpRotVector.z)

      positionRef.current.position.x += Math.sin(angle - rotationRef.current.rotation.y) * delta
      positionRef.current.position.z += Math.cos(angle - rotationRef.current.rotation.y) * delta
    } else if (currentSceneState.movement.bottom) {

      tmpRotVector.set(camera.matrixWorld.elements[8], 0.0, camera.matrixWorld.elements[10])
      angle = Math.atan2(tmpRotVector.x, tmpRotVector.z)

      positionRef.current.position.x -= Math.sin(angle - rotationRef.current.rotation.y) * delta
      positionRef.current.position.z -= Math.cos(angle - rotationRef.current.rotation.y) * delta
    }
  })

  /*
  useFrame(({camera}) => {
    Connection.current.sendInfo({
      matrix: camera.matrixWorld.toArray(),
      controllers: []
    })
  })
  */

  useThreeFrameProvider()
  useThreeStateProvider()

  useHitTestManager(currentSceneState.selectEnabled)
  
  return (
    <group
      ref={rotationRef}
      
    >
      <group
        ref={positionRef}
      >
        <group
          position={[0, -1.0, 0]}
        >
          <group
            
            scale={[currentSceneState.scale, currentSceneState.scale, currentSceneState.scale]}
            visible={sceneVisible}
          >
            <Background/>
            <Ground getAsset={getAsset}/>
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
            <Environment getAsset={getAsset}/>
            {Object.values(sceneObjects).map(target => renderObject(target, getAsset))}
          </group>
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
