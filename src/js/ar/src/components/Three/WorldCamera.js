import React, { useRef, useEffect, useContext, useCallback } from "react"
import { useThree, useFrame } from "react-three-fiber"
import { Matrix4, Vector3 } from "three"
import { SceneState } from "../../helpers/sceneState"

const transformMatrix = new Matrix4()
const moveMatrix = new Matrix4()
const moveInvertMatrix = new Matrix4()

const position = new Vector3()

const WorldCamera = (props) => {
  const [currentSceneState] = useContext(SceneState)

  const cameraRef = useRef()
  const transformRef = useRef()

  const { setDefaultCamera } = useThree()

  // Make the camera known to the system
  useEffect(() => void setDefaultCamera(cameraRef.current), [])
  useFrame(({ gl, scene }) => gl.render(scene, cameraRef.current), 1)

  
  const angleRef = useRef(new Vector3())
  const rotation = useRef(0);

  useFrame((state, delta) => {
    const dt = Math.max(delta, 0.0001)
    if (currentSceneState.movement.top) {

      let e = cameraRef.current.matrixWorld.elements
		  angleRef.current.set( -e[ 8 ], 0.0, -e[ 10 ] ).setLength(dt)
      angleRef.current.y = 0.0;

      transformRef.current.position.add(angleRef.current)
      transformRef.current.updateMatrixWorld(true)
    } else if (currentSceneState.movement.bottom) {

      let e = cameraRef.current.matrixWorld.elements
		  angleRef.current.set( e[ 8 ], 0.0, e[ 10 ] ).setLength(dt)
      angleRef.current.y = 0.0;

      transformRef.current.position.add(angleRef.current)
      transformRef.current.updateMatrixWorld(true)
    }

    if (currentSceneState.movement.left) {
      position.setFromMatrixPosition(transformRef.current.matrixWorld)

      moveMatrix.makeTranslation(-position.x, -position.y, -position.z)
      transformMatrix.makeRotationY((Math.PI / 180.0) * dt * 24.0)
      moveInvertMatrix.makeTranslation(position.x, position.y, position.z)

      transformRef.current.matrixWorld
      .identity()
      .multiply(moveInvertMatrix)
      .multiply(transformMatrix)
      .multiply(moveMatrix)

      transformRef.current.matrixWorld.decompose(
        transformRef.current.position,
        transformRef.current.quaternion,
        transformRef.current.scale
      )
    } else if (currentSceneState.movement.right) {
      position.setFromMatrixPosition(transformRef.current.matrixWorld)

      moveMatrix.makeTranslation(-position.x, -position.y, -position.z)
      transformMatrix.makeRotationY(-(Math.PI / 180.0) * dt * 24.0)
      moveInvertMatrix.makeTranslation(position.x, position.y, position.z)

      transformRef.current.matrixWorld
      .identity()
      .multiply(moveInvertMatrix)
      .multiply(transformMatrix)
      .multiply(moveMatrix)

      transformRef.current.matrixWorld.decompose(
        transformRef.current.position,
        transformRef.current.quaternion,
        transformRef.current.scale
      )
    }
  })

  return (
    <group ref={transformRef} >
      <perspectiveCamera ref={cameraRef} {...props} near={1.0} />
    </group>
  )
}

export default WorldCamera