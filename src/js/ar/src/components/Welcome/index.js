import React, {useState, useContext, useCallback, useEffect, useRef} from 'react'
import {Fade} from "react-reveal"

import {useFrame} from "../../hooks/useHitTestManager"
import {SceneState} from "../../helpers/sceneState"

import './index.scss'

const Welcome = ({ready}) => {
  const [currentSceneState, setSceneState] = useContext(SceneState)
  
  const [enabled, setEnabled] = useState(false)
  const [reticleVisible, setReticleVisible] = useState(false)
  
  const reticleRef = useRef(null)

  useFrame(({gl}, dt, reticle) => {
    if (ready && !enabled && gl.xr.isPresenting) {
      reticleRef.current = reticle
      setEnabled(true)
    }
    
    if (!reticle.visible) {
      return false
    }
    
    if (!reticleVisible && reticle.visible) {
      setReticleVisible(true)
      return false
    }
  }, [enabled, ready, reticleVisible])
  
  useEffect(() => {
    const onClick = () => {
      if (reticleVisible && reticleRef.current && currentSceneState.positioningEnabled) {
        setSceneState({
          ...currentSceneState,
          positioningEnabled: false,
          currentMatrix: reticleRef.current.matrix.toArray()
        })
      }
    }
    
    window.addEventListener('pointerup', onClick)
    
    return () => {
      window.removeEventListener('pointerup', onClick)
    }
  }, [reticleVisible, currentSceneState])

  const onAccept = useCallback((e) => {
    e.preventDefault()
    setSceneState({
      ...currentSceneState,
      positioningEnabled: false,
      isWelcome: false
    })
  }, [currentSceneState])

  const onTryAgain = useCallback((e) => {
    e.preventDefault()
    setSceneState({
      ...currentSceneState,
      positioningEnabled: true
    })
  }, [currentSceneState])

  if (!enabled || !ready) {
    return null
  }
  
  return (
    <div className='tutorial'>
      <Fade top opposite when={!reticleVisible && currentSceneState.positioningEnabled} duration={300}>
        <div className='tutorial__text'>Move your device until you see a blue marker</div>
      </Fade>

      <Fade top opposite when={reticleVisible && currentSceneState.positioningEnabled} delay={300} duration={300}>
        <div className='tutorial__text'>Tap to set a scene</div>
      </Fade>

      <Fade top opposite when={!currentSceneState.positioningEnabled} delay={300} duration={300}>
        <div className='tutorial__buttons'>
          <div className='tutorial__button active' onClick={onAccept}>Accept</div>
          <div className='tutorial__button' onClick={onTryAgain}>Try again</div>
        </div>
      </Fade>
      
    </div>
  )
}

export default Welcome
