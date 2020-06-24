import React, {useContext, useCallback, useState, useEffect, useMemo} from 'react'
import {useThreeFrame} from "../../hooks/useThreeHooks"

import {SceneState} from "../../helpers/sceneState"

import './index.scss'

const MoveButtons = () => {
  const [currentSceneState, setSceneState] = useContext(SceneState)
  
  const [movementEnabled, setMovementEnabled] = useState(false)
  const [direction, setDirection] = useState(0)
  
  /** Enable movement on group pointer down */
  const onGroupDown = useCallback(() => {
    setMovementEnabled(true)
  }, [])
  
  /** Disable movement on window pointer up*/
  useEffect(() => {
    const listener = () => {
      setMovementEnabled(false)
    }
    
    window.addEventListener('touchend', listener)
    window.addEventListener('touchcancel', listener)
    return () => {
      window.removeEventListener('touchend', listener)
      window.removeEventListener('touchcancel', listener)
    }
  }, [])
  
  let cameraDirection = useMemo(() => new THREE.Vector3(), [])
  let moveDirection = useMemo(() => new THREE.Vector2(), [])
  let moveCenter = useMemo(() => new THREE.Vector2(0, 0), [])

  useThreeFrame(({camera}) => {
    if (movementEnabled) {
      cameraDirection.set( - camera.matrixWorld.elements[ 8 ], - camera.matrixWorld.elements[ 9 ], - camera.matrixWorld.elements[ 10 ] ).normalize();
      moveDirection.set(cameraDirection.x, cameraDirection.z).rotateAround(moveCenter, direction)

      setSceneState({
        ...currentSceneState,
        position: [
          currentSceneState.position[0] + moveDirection.x * currentSceneState.scale * 0.5,
          currentSceneState.position[1],
          currentSceneState.position[2] + moveDirection.y * currentSceneState.scale * 0.5
        ]
      })
    }
  }, [currentSceneState, movementEnabled, direction])
  
  return (
    <div className='move-buttons' onPointerDown={onGroupDown}>
      <div className='move-buttons__row'>
        <div
          className='move-buttons__button'
          onTouchStart={() => setDirection(Math.PI)}
        />
      </div>
      <div className='move-buttons__row move-buttons__h'>
        <div
          className='move-buttons__button'
          onTouchStart={() => setDirection(Math.PI * 0.5)}
        />
        <div
          className='move-buttons__button'
          onTouchStart={() => setDirection(-Math.PI * 0.5)}
        />
      </div>
      <div className='move-buttons__row'>
        <div
          className='move-buttons__button'
          onTouchStart={() => setDirection(0)}
        />
      </div>
    </div>
  )
}

export default MoveButtons
