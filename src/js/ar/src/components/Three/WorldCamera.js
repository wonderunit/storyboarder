import React, { useRef, useEffect, useContext, useCallback } from "react"
import { useThree, useFrame } from "react-three-fiber"
import { Matrix4, Vector3 } from "three"
import { SceneState } from "../../helpers/sceneState"
import { Connection } from "../../helpers/store";



const tmpVec = new Vector3();
const tmpVec2 = new Vector3();
const tmpVec3 = new Vector3();
const tmpMat = new Matrix4();
const tmpMat2 = new Matrix4();

const saveCameraMatrixWorld = (camera) => {
  tmpMat2.copy(camera.matrixWorld)
  camera.parent.updateMatrix()
  camera.parent.updateMatrixWorld()

  tmpMat.getInverse(camera.parent.matrixWorld)
  tmpMat2.multiply(tmpMat)
  tmpMat2.decompose(camera.position, camera.quaternion, camera.scale)

  camera.updateMatrix()
  camera.updateMatrixWorld()
}

const WorldCamera = (props) => {
  const [currentSceneState] = useContext(SceneState)

  const cameraRef = useRef()
  const { setDefaultCamera } = useThree()

  // Make the camera known to the system
  useEffect(() => void setDefaultCamera(cameraRef.current), [])
  //useFrame(({ gl, scene }) => gl.render(scene, cameraRef.current), 1)

  useFrame(({camera, gl}, delta) => {
    const dt = Math.max(delta, 0.0001)

    //const camera = cameraRef.current
    //saveCameraMatrixWorld(camera)

    if (currentSceneState.movement.top) {
      tmpVec.set( camera.matrixWorld.elements[ 8 ], camera.matrixWorld.elements[ 9 ], camera.matrixWorld.elements[ 10 ] )
      tmpVec.normalize()
      tmpVec.y = 0.0
      tmpVec.multiplyScalar(2.0 * dt)
      
  
      camera.parent.position.sub(tmpVec)
      camera.parent.updateMatrixWorld()
    } else if (currentSceneState.movement.bottom) {
      tmpVec.set( camera.matrixWorld.elements[ 8 ], camera.matrixWorld.elements[ 9 ], camera.matrixWorld.elements[ 10 ] )
      tmpVec.normalize()
      tmpVec.y = 0.0
      tmpVec.multiplyScalar(2.0 * dt)
  
      camera.parent.position.add(tmpVec)
      camera.parent.updateMatrixWorld()
    }
  
    if (currentSceneState.movement.left) {
      gl.xr.getCamera(camera)

      tmpMat.getInverse(camera.parent.matrixWorld)
      tmpMat2.copy(camera.matrixWorld).multiply(tmpMat)

      tmpVec.setFromMatrixPosition(camera.matrixWorld)
  
      camera.parent.rotation.y += Math.PI / 180.0 * 24.0 * dt
      camera.parent.updateMatrixWorld()
  
      tmpMat2.multiply(camera.parent.matrixWorld)

      gl.xr.getCamera(camera)
      tmpVec2.setFromMatrixPosition(tmpMat2)
      tmpVec.sub(tmpVec2)
  
      camera.parent.position.add(tmpVec)
      camera.parent.updateMatrixWorld()
      
    } else if (currentSceneState.movement.right) {
      gl.xr.getCamera(camera)

      tmpMat.getInverse(camera.parent.matrixWorld)
      tmpMat2.copy(camera.matrixWorld).multiply(tmpMat)

      tmpVec.setFromMatrixPosition(camera.matrixWorld)
      tmpVec3.copy(tmpVec)
  
      camera.parent.rotation.y -= Math.PI / 180.0 * 24.0 * dt
      camera.parent.updateMatrixWorld()
  
      tmpMat2.multiply(camera.parent.matrixWorld)
      
      gl.xr.getCamera(camera)
      tmpVec2.setFromMatrixPosition(camera.matrixWorld)
      tmpVec.sub(tmpVec2)

  
      camera.parent.position.add(tmpVec)
      camera.parent.updateMatrixWorld()
    }
  })

  return (
    <group position={[0.0, 1.0, 0.0]}>
      <group>
        <group>
          <perspectiveCamera ref={cameraRef} {...props} near={0.1} far={100.0} />
        </group>
      </group>
    </group>
  )
}

export default WorldCamera