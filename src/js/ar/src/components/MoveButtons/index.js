import React, {useContext, useCallback, useEffect} from 'react'

import classnames from 'classnames'

import {SceneState} from "../../helpers/sceneState"

import './index.scss'


const MoveButtons = () => {
  const [sceneState, setSceneState] = useContext(SceneState)
  
  useEffect(() => {
    const cancelMove = () => {
      setSceneState({...sceneState, movement: {left: false, right: false, top: false, bottom: false}})
    }
    
    document.addEventListener('pointerout', cancelMove)
    document.addEventListener('pointerup', cancelMove)

    return () => {
      document.removeEventListener('pointerout', cancelMove)
      document.removeEventListener('pointerup', cancelMove)
    }
  }, [sceneState])

  const setLeft = useCallback(() => setSceneState({...sceneState, movement: {...sceneState.movement, left: true}}), [sceneState])
  const setRight = useCallback(() => setSceneState({...sceneState, movement: {...sceneState.movement, right: true}}), [sceneState])
  const setTop = useCallback(() => setSceneState({...sceneState, movement: {...sceneState.movement, top: true}}), [sceneState])
  const setBottom = useCallback(() => setSceneState({...sceneState, movement: {...sceneState.movement, bottom: true}}), [sceneState])

  const leftBtnClass = classnames({
    left: true,
    active: sceneState.movement.left
  })

  const rightBtnClass = classnames({
    right: true,
    active: sceneState.movement.right
  })

  const topBtnClass = classnames({
    top: true,
    active: sceneState.movement.top
  })

  const bottomBtnClass = classnames({
    bottom: true,
    active: sceneState.movement.bottom
  })
  
  return (
    <div className='move-areas'>
      <div className='visual'>
        <div className={leftBtnClass} />
        <div className={topBtnClass} />
        <div className={bottomBtnClass} />
        <div className={rightBtnClass} />
      </div>
      <div className='buttons'>
        <div className='left' onPointerDown={setLeft} />
        <div className='vertical'>
          <div className='top' onPointerDown={setTop} />
          <div className='bottom' onPointerDown={setBottom} />
        </div>
        <div className='right' onPointerDown={setRight} />
      </div>
    </div>
  )
}

export default MoveButtons
