import React, {useRef, useContext, useEffect} from 'react'
import { useFrame } from 'react-three-fiber'
import { Matrix4, Quaternion, Vector3 } from 'three'
import { SceneState } from '../../helpers/sceneState'


let axisAngle = new Vector3(0.0, 1.0, 0.0)
let cameraOrigin = new Vector3()
let cameraDirection = new Vector3()
let dist = 0;

const Teleport = ({rotationRef, positionRef}) => {
  const [currentSceneState, setSceneState] = useContext(SceneState)

  const ref = useRef(null)
  const parentInverseRef = useRef(new Matrix4())

  useFrame(({camera}) => {
    cameraOrigin.setFromMatrixPosition( camera.matrixWorld )
    cameraDirection.set( 0.0, 0.0, 0.5 ).unproject( camera ).sub( cameraOrigin ).normalize()

    dist = (cameraOrigin.y + 1.0) / Math.max(Math.abs(cameraDirection.y), 0.0001)
    
    ref.current.position.x = (cameraOrigin.x + cameraDirection.x * dist)
    ref.current.position.z = (cameraOrigin.z + cameraDirection.z * dist)
    ref.current.position.y = -1.0

    parentInverseRef.current.getInverse(ref.current.parent.matrixWorld)
    ref.current.position.applyMatrix4(parentInverseRef.current)
  })

  useEffect(() => {
    if (currentSceneState.shouldTeleport) {
      positionRef.current.position.x = ref.current.position.x
      positionRef.current.position.z = ref.current.position.z

      setSceneState({
        ...currentSceneState,
        shouldTeleport: false
      });
    }
  }, [currentSceneState.shouldTeleport])
  
  
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
