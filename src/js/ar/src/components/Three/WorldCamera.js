import React, { useRef, useEffect, useContext, useCallback } from "react"
import { useThree, useFrame } from "react-three-fiber"
import { Matrix4, Vector3 } from "three"
import { SceneState } from "../../helpers/sceneState"

const position = new Vector3()

const translationMatrix = new Matrix4()
const rotationMatrix = new Matrix4()
const inverseTranslationMatrix = new Matrix4()

const updateRotation = (ref, camera, rotation) => {
  position.setFromMatrixPosition(camera.matrixWorld)

  translationMatrix.makeTranslation(-position.x, -position.y, -position.z)
  rotationMatrix.makeRotationY(rotation)
  inverseTranslationMatrix.makeTranslation(position.x, position.y, position.z)

  ref.current.matrixWorld
  .identity()
  .multiply(inverseTranslationMatrix)
  .multiply(rotationMatrix)
  .multiply(translationMatrix)

  // inverseTranslationMatrix.getInverse(camera.matrixWorld)
  // rotationMatrix.makeRotationY(rotation)

  // ref.current.matrixWorld
  // .identity()
  // .multiply(camera.matrixWorld)
  // .multiply(rotationMatrix)
  // .multiply(inverseTranslationMatrix)

  ref.current.matrixWorld.decompose(
    ref.current.position,
    ref.current.quaternion,
    ref.current.scale
  )

  // ref.current.updateMatrixWorld(true);

  //camera.updateMatrixWorld(true)
}

const WorldCamera = (props) => {
  const [currentSceneState] = useContext(SceneState)

  const cameraRef = useRef()
  const positionRef = useRef()
  const rotationRef = useRef()

  const rotation = useRef(0.0);

  const { setDefaultCamera } = useThree()

  // Make the camera known to the system
  useEffect(() => void setDefaultCamera(cameraRef.current), [])
  useFrame(({ gl, scene }) => gl.render(scene, cameraRef.current), 1)

  useFrame(({camera}, delta) => {
    if (currentSceneState.movement.left) {
      rotation.current += delta
    } else if (currentSceneState.movement.right) {
      rotation.current -= delta
    }

    //updateRotation(props.positionRef, camera, rotation.current)

    // rotationRef.current.position.copy(cameraRef.current.position)//.negate()
    // rotationRef.current.position.y = 0.0
    
    if (currentSceneState.movement.top) {

      // positionRef.current.position.x += angleRef.current.x * delta
      // positionRef.current.position.z += angleRef.current.z * delta
    } else if (currentSceneState.movement.bottom) {

      // positionRef.current.position.x -= angleRef.current.x * delta
      // positionRef.current.position.z -= angleRef.current.z * delta
    }
  }, 2)

  const onBeforeRender = useCallback((renderer, scene, camera) => {
    camera.matrixWorld.setPosition(0, 0, 0);
  }, [])

  return (
    <group
      position={[0.0, 1.0, 0.0]}
      ref={props.positionRef}
      onBeforeRender={onBeforeRender}
    >
      <group
        ref={props.rotationRef}
      >
        <perspectiveCamera ref={cameraRef} {...props} />
      </group>
    </group>
  )
}

export default WorldCamera