
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

import classNames from 'classnames'

import KeyCommandsSingleton from '../KeyHandler/KeyCommandsSingleton'

import Scrollable from '../Scrollable'
import deepEqualSelector from '../../../utils/deepEqualSelector'

import useTooltip from '../../../hooks/use-tooltip'
import { useTranslation } from 'react-i18next'

const cameraSceneObjectSelector = (state) => {
  const sceneObjects = getSceneObjects(state)
  return Object.values(sceneObjects).filter(object => object.type === "camera").map((object) => {
    return {
      id:           object.id,
    }
  })
}
const getCameraSceneObjects = deepEqualSelector([cameraSceneObjectSelector], (sceneObjects) => sceneObjects)

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
  undoGroupStart,
  undoGroupEnd,
}) => {
  const { t } = useTranslation()

  const onCameraSelectByIndex = useCallback(index => {
    if (_cameras[index]) {
      let id = _cameras[index].id
      undoGroupStart()
      selectObject(id)
      setActiveCamera(id)
      undoGroupEnd()
    }
  }, [_cameras])



  useEffect(() => {
    KeyCommandsSingleton.getInstance().addKeyCommand({
      key: "cameraSelector",
      keyCustomCheck: (event) => numberCheck(event),
      value: (event) => { onCameraSelectByIndex(parseInt(event.key, 10) - 1) }
    })
    return () => KeyCommandsSingleton.getInstance().removeKeyCommand({ key: "cameraSelector" })
  }, [_cameras])


  const onClick = (camera, event) => {
    event.preventDefault()

    undoGroupStart()
    selectObject(camera.id)
    setActiveCamera(camera.id)
    undoGroupEnd()
  }

  const getFirstElementStyle = (camera, n) => {
    if(n === 0) {
      return <a key={ n }
            href="#"
            className={ classNames({ active: activeCamera === camera.id }) }
            onClick={ onClick.bind(this, camera) }
            style={{marginLeft: "auto"}}>
          { n + 1 }
      </a>
    } else {
      return <a key={ n }
            href="#"
            className={ classNames({ active: activeCamera === camera.id }) }
            onClick={ onClick.bind(this, camera) }>
          { n + 1 }
      </a>
    }
  }

  useEffect(() => {
    let scrollContainer = document.getElementsByClassName("cameras-inspector")[0].children[0].children[1]
    let selectedCamera = scrollContainer.children[0].getElementsByClassName("active")[0]
    scrollContainer.scrollTo({
      top: selectedCamera.offsetTop,
      left: selectedCamera.clientWidth * (parseInt(selectedCamera.text) - 1),
      behavior: 'smooth'
    })
  }, [_cameras, activeCamera])
  
  const cameraTooltipEvents = useTooltip(t('shot-generator.camera-inspector.change-active-camera.title'), t('shot-generator.camera-inspector.change-active-camera.description'), "1|2|3", "top right")

  return <div className="cameras-inspector">
        <div className="row" {...cameraTooltipEvents}>
            <div className="cameras-inspector__label">{t('shot-generator.camera-inspector.camera')}</div>
            <Scrollable >
              <div className="round-buttons-panel" style={{ justifyContent: "flex-start"}} >
               { _cameras.map(
                 (camera, n) =>
                  getFirstElementStyle(camera, n),
               ) }
               </div>
             </Scrollable>
        </div>
    </div>
})

export default CamerasInspector
