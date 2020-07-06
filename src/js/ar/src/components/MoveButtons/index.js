import React, {useContext, useCallback, useState, useEffect, useMemo} from 'react'
import {useThreeFrame} from "../../hooks/useThreeHooks"

import {SceneState} from "../../helpers/sceneState"

import './index.scss'

const MoveButtons = () => {
  const [currentSceneState, setSceneState] = useContext(SceneState)
  
  const [movementEnabled, setMovementEnabled] = useState(false)
  const [rotationEnabled, setRotationEnabled] = useState(false)
  const [direction, setDirection] = useState(0)
  
  /** Enable movement on pointer down */
  const onMovementEnabled = useCallback((angle) => {
    setMovementEnabled(true)
    setDirection(angle)
  }, [])

  /** Enable rotation on pointer down */
  const onRotationEnabled = useCallback((angle) => {
    setRotationEnabled(true)
    setDirection(angle)
  }, [])
  
  /** Disable movement/rotation on touch end*/
  const onTouchEnd = useCallback((angle) => {
    setRotationEnabled(false)
    setMovementEnabled(false)
  }, [])
  
  let cameraDirection = useMemo(() => new THREE.Vector3(), [])
  let moveDirection = useMemo(() => new THREE.Vector2(), [])
  let moveCenter = useMemo(() => new THREE.Vector2(0, 0), [])

  useThreeFrame(({camera}) => {
    if (movementEnabled) {
      cameraDirection.set( - camera.matrixWorld.elements[ 8 ], - camera.matrixWorld.elements[ 9 ], - camera.matrixWorld.elements[ 10 ] ).normalize();
      moveDirection.set(cameraDirection.x, cameraDirection.z).rotateAround(moveCenter, direction + currentSceneState.rotation)

      setSceneState({
        ...currentSceneState,
        position: [
          currentSceneState.position[0] + moveDirection.x * currentSceneState.scale * 0.2,
          currentSceneState.position[1],
          currentSceneState.position[2] + moveDirection.y * currentSceneState.scale * 0.2
        ]
      })
    } else if (rotationEnabled) {
      setSceneState({
        ...currentSceneState,
        rotation: currentSceneState.rotation - Math.sign(direction) * 0.1
      })
    }
  }, [currentSceneState, movementEnabled, direction])
  
  return (
    <div className='move-buttons'>
      <div className='move-buttons__row'>
        <div
          className='move-buttons__button'
          onTouchStart={() => onMovementEnabled(Math.PI)}
          onTouchEnd={onTouchEnd}
          onTouchCancel={onTouchEnd}
        />
      </div>
      <div className='move-buttons__row move-buttons__h'>
        <div
          className='move-buttons__button'
          onTouchStart={() => onRotationEnabled(Math.PI * 0.5)}
          onTouchEnd={onTouchEnd}
          onTouchCancel={onTouchEnd}
        />
        <div
          className='move-buttons__button'
          onTouchStart={() => onRotationEnabled(-Math.PI * 0.5)}
          onTouchEnd={onTouchEnd}
          onTouchCancel={onTouchEnd}
        />
      </div>
      <div className='move-buttons__row'>
        <div
          className='move-buttons__button'
          onTouchStart={() => onMovementEnabled(0)}
          onTouchEnd={onTouchEnd}
          onTouchCancel={onTouchEnd}
        />
      </div>
    </div>
  )
}

export default MoveButtons
