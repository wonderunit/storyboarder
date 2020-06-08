import React, {useContext, useCallback, useState} from 'react'
import Fade from 'react-reveal/Fade'

import {SceneState} from "../../helpers/sceneState"

import './index.scss'

const preventFn = (e) => e.preventDefault()

const ScaleButtons = () => {
  const [currentSceneState, setSceneState] = useContext(SceneState)
  const [isVisible, setVisibility] = useState(false)
  
  const onClick = useCallback((v) => {
    setSceneState({
      ...currentSceneState,
      scale: [v, v, v]
    })

    setVisibility(false)
  }, [])
  
  return (
    <div className='scale-buttons' onClick={preventFn}>
      <div className='scale-buttons__button scale-buttons__main-button' onClick={() => setVisibility(!isVisible)}>x{currentSceneState.scale[0] / 0.02}</div>

      <Fade top cascade duration={300} when={isVisible}>
        <div>
          <div className='scale-buttons__button' onClick={() => onClick(0.02)}>x1</div>
          <div className='scale-buttons__button' onClick={() => onClick(1)}>x50</div>
          <div className='scale-buttons__button' onClick={() => onClick(10)}>x500</div>
        </div>
      </Fade>
    </div>
  )
}

export default ScaleButtons
