import React, {useState, useContext, useRef} from 'react'
import {connect} from "react-redux"
import {useFrame, useThree} from "react-three-fiber"

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
import Teleport from '../Three/Teleport'

import useHitTestManager from "../../hooks/useHitTestManager"
import { Matrix4, Vector3 } from 'three'
import WorldCamera from '../Three/WorldCamera'

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


const transformMatrix = new Matrix4();

const Scene = ({sceneObjects, world, getAsset}) => {
  const [currentSceneState] = useContext(SceneState)
  const [sceneVisible, setSceneVisible] = useState(true)

  const {camera} = useThree()

  const rotationRef = useRef(null)
  const positionRef = useRef(null)
  const transformRef = useRef(null)
  const angleRef = useRef(new Vector3())

  useFrame((state, delta) => {
    if (currentSceneState.movement.top) {

      let e = camera.matrixWorld.elements
		  angleRef.current.set( e[ 8 ], 0.0, e[ 10 ] ).setLength(delta)
      angleRef.current.y = 0.0;

      transformRef.current.position.add(angleRef.current)
      transformRef.current.updateMatrixWorld(true)
    } else if (currentSceneState.movement.bottom) {

      let e = camera.matrixWorld.elements
		  angleRef.current.set( e[ 8 ], 0.0, e[ 10 ] ).setLength(delta).negate()
      angleRef.current.y = 0.0;

      transformRef.current.position.add(angleRef.current)
      transformRef.current.updateMatrixWorld(true)
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

  // useThreeFrameProvider()
  // useThreeStateProvider()

  // useHitTestManager(currentSceneState.selectEnabled)
  
  return (
    <group
      // ref={rotationRef}
      ref={transformRef}
    >
      
      <group
        // ref={positionRef}
        position={[0.0, -1.0, 0.0]}
        frustumCulled={false}
      >
        
        <group
          scale={[currentSceneState.scale, currentSceneState.scale, currentSceneState.scale]}
          visible={sceneVisible}
        >
          {/* <WorldCamera rotationRef={rotationRef} positionRef={positionRef} /> */}
          {/* <Teleport rotationRef={rotationRef} positionRef={positionRef} angleRef={angleRef} /> */}
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
  )
}

const mapStateToProps = (state) => ({
  sceneObjects: getSceneObjects(state),
  world: getWorld(state)
})

export default connect(mapStateToProps)(Scene)
