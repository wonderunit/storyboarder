import React, {useContext, useCallback, useState} from 'react'
import Fade from 'react-reveal/Fade'

import {SceneState} from "../../helpers/sceneState"

import './index.scss'

const preventFn = (e) => e.preventDefault()

const TeleportButtons = () => {
  const [sceneState, setSceneState] = useContext(SceneState)
  const [isVisible, setVisibility] = useState(false)
  
  const onTeleport = useCallback(() => setSceneState({...sceneState, shouldTeleport: true}), [sceneState])

  return (
    <div className='teleport-buttons' onClick={preventFn}>
      <div className='teleport-buttons__button teleport-buttons__main-button' onClick={onTeleport}>
        <img src='https://live.staticflickr.com/4540/38681464401_5019570455_o.png' />
      </div>
    </div>
  )
}

export default TeleportButtons
