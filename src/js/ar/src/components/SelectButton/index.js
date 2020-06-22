import React, {useContext, useCallback, useState, useEffect, useMemo} from 'react'
import {useThreeFrame} from "../../hooks/useThreeHooks"
import classnames from 'classnames'

import {SceneState} from "../../helpers/sceneState"

import './index.scss'

const SelectButton = () => {
  const [currentSceneState, setSceneState] = useContext(SceneState)

  const onSelect = useCallback(() => {
    setSceneState({
      ...currentSceneState,
      selectEnabled: true
    })
  }, [currentSceneState])

  useEffect(() => {
    const fn = () => {
      setSceneState({
        ...currentSceneState,
        selectEnabled: false
      })
    }

    window.addEventListener('touchcancel', fn, false)
    window.addEventListener('touchend', fn, false)

    return () => {
      window.removeEventListener('touchcancel', fn, false)
      window.removeEventListener('touchend', fn, false)
    }
  }, [currentSceneState])

  const className = classnames({
    'select-button__pointer': true,
    'active': currentSceneState.selectEnabled
  })
  
  return (
      <>
        <div className={className} />
        <div className='select-button__button' onTouchStart={onSelect} />
      </>
  )
}

export default SelectButton
