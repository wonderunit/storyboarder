import React, {useContext, useCallback, useState} from 'react'
import Fade from 'react-reveal/Fade'

import {SceneState} from "../../helpers/sceneState"

import './index.scss'

const preventFn = (e) => e.preventDefault()

const options = {
  [0.16]: 'mini',
  [0.5]: '50%',
  [1.0]: '100%'
}

const getScaleLabel = (scale) => {
  const value = Object.keys(options).find((item) => Math.abs(item - scale) < 0.01)
  if (value) {
    return options[value]
  }
  return null
}

const ScaleButtons = () => {
  const [currentSceneState, setSceneState] = useContext(SceneState)
  const [isVisible, setVisibility] = useState(false)
  
  const onClick = useCallback((v) => {
    setSceneState({
      ...currentSceneState,
      scale: v
    })

    setVisibility(false)
  }, [currentSceneState])
  
  return (
    <div className='scale-buttons' onClick={preventFn}>
      <div className='scale-buttons__button scale-buttons__main-button' onClick={() => setVisibility(!isVisible)}>{getScaleLabel(currentSceneState.scale)}</div>

      <Fade top cascade duration={300} when={isVisible}>
        <div>
          <div className='scale-buttons__button' onClick={() => onClick(0.16)}>mini</div>
          <div className='scale-buttons__button' onClick={() => onClick(0.5)}>50</div>
          <div className='scale-buttons__button' onClick={() => onClick(1.0)}>100</div>
        </div>
      </Fade>
    </div>
  )
}

export default ScaleButtons
