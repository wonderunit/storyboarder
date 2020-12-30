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

  const onDeselect = useCallback(() => {
    setSceneState({
      ...currentSceneState,
      selectEnabled: false
    })
  }, [currentSceneState])

  const className = classnames({
    'select-button__pointer': true,
    'active': currentSceneState.selectEnabled
  })
  
  return (
      <>
        <div className={className} />
        <div className='select-button__button' onTouchStart={onSelect} onTouchEnd={onDeselect} onTouchCancel={onDeselect} />
      </>
  )
}

export default SelectButton
