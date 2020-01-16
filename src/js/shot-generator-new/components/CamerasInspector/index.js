
import {
    selectObject,

    updateObject,
    setActiveCamera,
    undoGroupStart,
    undoGroupEnd,

    getActiveCamera,
    getSceneObjects,

  } from '../../../shared/reducers/shot-generator'

import React, { useEffect, useCallback } from 'react'
import { connect } from 'react-redux'

import { createSelector } from 'reselect'
import classNames from 'classnames'

import KeyCommandsSingleton from '../KeyHandler/KeyCommandsSingleton'

const getCameraSceneObjects = createSelector(
    [getSceneObjects],
    (sceneObjects) => Object.values(sceneObjects).filter(o => o.type === 'camera')
  )

const numberCheck = (event) => {
 return event.key === '1' ||
        event.key === '2' ||
        event.key === '3' ||
        event.key === '4' ||
        event.key === '5' ||
        event.key === '6' ||
        event.key === '7' ||
        event.key === '8' ||
        event.key === '9'
}

const CamerasInspector = connect(
  state => ({
    activeCamera: getActiveCamera(state),
    _cameras: getCameraSceneObjects(state)
  }),
  {
    setActiveCamera,
    selectObject,
    updateObject,
    undoGroupStart,
    undoGroupEnd,
  }
)(
({
  // props
  activeCamera,

  // via selectors
  _cameras,

  // action creators
  setActiveCamera,
  selectObject,
  updateObject,
  undoGroupStart,
  undoGroupEnd,
}) => {

  const onCameraSelectByIndex = useCallback(index => {
    if (_cameras[index]) {
      let id = _cameras[index].id
      undoGroupStart()
      selectObject(id)
      setActiveCamera(id)
      undoGroupEnd()
    }
  }, [_cameras])

  const rollCamera = useCallback(() => {
    let cameraState = _cameras.find(camera => camera.id === activeCamera)
    let roll = {
      'z': Math.max(cameraState.roll - THREE.Math.DEG2RAD, -45 * THREE.Math.DEG2RAD),
      'x': Math.min(cameraState.roll + THREE.Math.DEG2RAD, 45 * THREE.Math.DEG2RAD)
    }[event.key]

    updateObject(activeCamera, { roll })
  }, [_cameras, activeCamera])

  useEffect(() => {
    KeyCommandsSingleton.getInstance().addKeyCommand({
      key: "cameraSelector",
      keyCustomCheck: (event) => numberCheck(event),
      value: (event) => { onCameraSelectByIndex(parseInt(event.key, 10) - 1) }
    })
    return () => KeyCommandsSingleton.getInstance().removeKeyCommand({ key: "cameraSelector" })
  }, [_cameras])

  useEffect(() => {
    KeyCommandsSingleton.getInstance().addKeyCommand({
      key: "cameraRoll",
      keyCustomCheck: (event) => (event.key === 'z' || event.key === 'x') &&
                          !event.shiftKey &&
                          !event.metaKey &&
                          !event.ctrlKey &&
                          !event.altKey,
      value: (event) => { rollCamera(event) }
    })
    return () => KeyCommandsSingleton.getInstance().removeKeyCommand({ key: "cameraRoll" })
  }, [_cameras, activeCamera])

  const onClick = (camera, event) => {
    event.preventDefault()

    undoGroupStart()
    selectObject(camera.id)
    setActiveCamera(camera.id)
    undoGroupEnd()
  }

  return <div className="cameras-inspector">
        <div className="row">
            <div className="cameras-inspector__label">Camera</div>
            <div className="round-buttons-panel">
             { _cameras.map(
               (camera, n) =>
                   <a key={ n }
                     href="#"
                     className={ classNames({ active: activeCamera === camera.id }) } 
                     onClick={ onClick.bind(this, camera) }>
                   { n + 1 }
                   </a>,
             ) }
             </div>
        </div>
    </div>
})

export default CamerasInspector
