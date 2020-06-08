import React, {useContext} from 'react'
import {SceneState} from "../../helpers/sceneState"

import './index.scss'

const MovementArrows = () => {
  const [currentSceneState, setSceneState] = useContext(SceneState)
  
  return (
    <div className='movement-container'>
      <div className='movement-container__row'>
        <div className='movement-container__button'>Up</div>
      </div>

      <div className='movement-container__row'>
        <div className='movement-container__button'>Left</div>
        <div className='movement-container__button'>Right</div>
      </div>

      <div className='movement-container__row'>
        <div className='movement-container__button'>Down</div>
      </div>
    </div>
  )
}

export default MovementArrows
