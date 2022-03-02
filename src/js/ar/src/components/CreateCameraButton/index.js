import React, {useContext, useCallback} from 'react'

import {SceneState} from "../../helpers/sceneState"

import './index.scss'

const preventFn = (e) => e.preventDefault()

const CreateCameraButton = () => {
  const [sceneState, setSceneState] = useContext(SceneState)
  
  const onCreateCamera = useCallback(() => setSceneState({...sceneState, shouldCreateCamera: true}), [sceneState])

  return (
    <div className='create-camera-button' onClick={preventFn}>
      <div className='create-camera-button__button create-camera-button__main-button' onClick={onCreateCamera}>
        <img src='http://simpleicon.com/wp-content/uploads/camera.png' />
      </div>
    </div>
  )
}

export default CreateCameraButton
