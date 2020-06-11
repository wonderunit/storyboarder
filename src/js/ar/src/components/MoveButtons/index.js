import React, {useContext, useCallback, useState, useEffect, useMemo} from 'react'
import {useFrame} from "../../hooks/useHitTestManager"

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
    const listener = (e) => {
      e.preventDefault()
      setMovementEnabled(false)
    }
    
    window.addEventListener('pointerup', listener)
    return () => {
      window.removeEventListener('pointerup', listener)
    }
  }, [])
  
  /** Change direction if we over the direction button and movement is enabled */
  const onPointerOver = useCallback((e) => {
    console.clear()
    console.log(e.target.dataset.dir)
    //if (movementEnabled) {
      switch (e.target.dataset.dir) {
        case '0':
          setDirection(0)
          break
        case '1':
          setDirection(-Math.PI * 0.5)
          break
        case '2':
          setDirection(Math.PI * 0.5)
          break
        case '3':
          setDirection(Math.PI)
          break
      }
    //}
  }, [])
  
  let cameraDirection = useMemo(() => new THREE.Vector3(), [])
  let moveDirection = useMemo(() => new THREE.Vector2(), [])
  let moveCenter = useMemo(() => new THREE.Vector2(0, 0), [])
  
  useFrame(({camera}) => {
    if (movementEnabled) {
      camera.getWorldDirection(cameraDirection)
      moveDirection.set(cameraDirection.x, cameraDirection.z).rotateAround(moveCenter, direction)

      setSceneState({
        ...currentSceneState,
        position: [
          currentSceneState.position[0] + moveDirection.x * 0.01,
          currentSceneState.position[1],
          currentSceneState.position[2] + moveDirection.y * 0.01
        ]
      })
    }
  }, [currentSceneState, movementEnabled, direction])
  
  return (
    <div className='move-buttons' onPointerDown={onGroupDown}>
      <div className='move-buttons__row'>
        <div
          className='move-buttons__button'
          data-dir='0'
          onPointerOver={onPointerOver}
          onPointerEnter={onPointerOver}
        />
      </div>
      <div className='move-buttons__row move-buttons__h'>
        <div
          className='move-buttons__button'
          data-dir='1'
          onPointerOver={onPointerOver}
          onPointerEnter={onPointerOver}
        />
        <div
          className='move-buttons__button'
          data-dir='2'
          onPointerOver={onPointerOver}
          onPointerEnter={onPointerOver}
        />
      </div>
      <div className='move-buttons__row'>
        <div
          className='move-buttons__button'
          data-dir='3'
          onPointerOver={onPointerOver}
          onPointerEnter={onPointerOver}
        />
      </div>
    </div>
  )
}

export default MoveButtons
