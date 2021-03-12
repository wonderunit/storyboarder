import React, {useRef, useContext, useEffect} from 'react'
import { useFrame } from 'react-three-fiber'
import { Matrix4, Quaternion, Vector3 } from 'three'
import { SceneState } from '../../helpers/sceneState'


let axisAngle = new Vector3(0.0, 1.0, 0.0)
let cameraOrigin = new Vector3()
let cameraDirection = new Vector3()
let dist = 0;

const Teleport = ({}) => {
  const [currentSceneState, setSceneState] = useContext(SceneState)

  const ref = useRef(null)

  useFrame(({camera, gl}) => {
    gl.xr.getCamera(camera)

    cameraOrigin.setFromMatrixPosition( camera.matrixWorld )
    cameraDirection.set( 0.0, 0.0, 0.5 ).unproject( camera ).sub( cameraOrigin ).normalize()

    dist = cameraOrigin.y / Math.max(Math.abs(cameraDirection.y), 0.0001)
    
    ref.current.position.x = (cameraOrigin.x + cameraDirection.x * dist)
    ref.current.position.z = (cameraOrigin.z + cameraDirection.z * dist)

    if (currentSceneState.shouldTeleport) {
      camera.parent.position.x = ref.current.position.x
      camera.parent.position.z = ref.current.position.z

      setSceneState({
        ...currentSceneState,
        shouldTeleport: false
      })
    }
  })
  
  return (
    <mesh ref={ref} >
      <cylinderBufferGeometry
        attach="geometry"
        args={[0.5, 0.5, 0.5, 32]}
      />
      <meshBasicMaterial
        attach="material"
        color='#8c78f1'
        opacity={0.7}
        transparent={true}
        flatShading={true}
        depthTest={false}
        depthWrite={false}
      />
    </mesh>
  )
}


export default Teleport
