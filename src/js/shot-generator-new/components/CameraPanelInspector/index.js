import React, { useEffect, useState, useRef, useContext } from 'react'
import { connect } from 'react-redux'
import * as THREE from 'three'
import {
    updateObject,
    setCameraShot,

    getSceneObjects,
    getSelections,
    getActiveCamera,
} from '../../../shared/reducers/shot-generator'
import useLongPress from '../../../hooks/use-long-press'
import Select from '../Select'

import throttle from 'lodash.throttle'

import CameraControls from '../../CameraControls'
import { ShotSizes, ShotAngles } from '../../cameraUtils'
import { useDrag } from 'react-use-gesture'

const CameraPanelInspector = connect(
    state => ({
      sceneObjects: getSceneObjects(state),
      activeCamera: getActiveCamera(state),
      selections: getSelections(state),
      cameraShots: state.cameraShots
    }),
    {
      updateObject,
      setCameraShot
    }
)(
  React.memo(({ camera, selections, sceneObjects, activeCamera, cameraShots, updateObject, setCameraShot }) => {
    if (!camera) return <div className="camera-inspector"/>
    
    const shotInfo = cameraShots[camera.userData.id] || {}
    const [currentShotSize, setCurrentShotSize] = useState(shotInfo.size)
    const [currentShotAngle, setCurrentShotAngle] = useState(shotInfo.angle)
  
    useEffect(() => {
      setCurrentShotSize(shotInfo.size)
    }, [shotInfo.size, camera])
  
    useEffect(() => {
      setCurrentShotAngle(shotInfo.angle)
    }, [shotInfo.angle, camera])
    
    let cameraState = {...sceneObjects[activeCamera]}
    
    let fakeCamera = camera.clone() // TODO reuse a single object
    let focalLength = fakeCamera.getFocalLength()
    let cameraRoll = Math.round(THREE.Math.radToDeg(cameraState.roll))
    let cameraPan = Math.round(THREE.Math.radToDeg(cameraState.rotation))
    let cameraTilt = Math.round(THREE.Math.radToDeg(cameraState.tilt))
    
    const getValueShifter = (draft) => () => {
      for (let [k, v] of Object.entries(draft)) {
        cameraState[k] += v
      }
  
      updateObject(cameraState.id, cameraState)
    }
    
    const moveCamera = ([speedX, speedY]) => () => {
      cameraState = CameraControls.getMovedState(cameraState, {x: speedX, y: speedY})
      updateObject(cameraState.id, cameraState)
    }
  
    const getCameraPanEvents = useDrag(throttle(({ down, delta: [dx, dy] }) => {
      let rotation = THREE.Math.degToRad(cameraPan - dx)
      let tilt = THREE.Math.degToRad(cameraTilt - dy)
      
      updateObject(cameraState.id, {rotation, tilt})
    }, 100, {trailing:false}))
    
    const onSetShot = ({size, angle}) => {      
      setCameraShot(camera.userData.id, {size, angle})
    }
  
    const shotSizes = [
      { value: ShotSizes.EXTREME_CLOSE_UP,  label: "Extreme Close Up" },
      { value: ShotSizes.VERY_CLOSE_UP,     label: "Very Close Up" },
      { value: ShotSizes.CLOSE_UP,          label: "Close Up" },
      { value: ShotSizes.MEDIUM_CLOSE_UP,   label: "Medium Close Up" },
      { value: ShotSizes.BUST,              label: "Bust" },
      { value: ShotSizes.MEDIUM,            label: "Medium Shot" },
      { value: ShotSizes.MEDIUM_LONG,       label: "Medium Long Shot" },
      { value: ShotSizes.LONG,              label: "Long Shot / Wide" },
      { value: ShotSizes.EXTREME_LONG,      label: "Extreme Long Shot" },
      { value: ShotSizes.ESTABLISHING,      label: "Establishing Shot" }
    ]
  
    const shotAngles = [
      { value: ShotAngles.BIRDS_EYE,        label: "Bird\'s Eye" },
      { value: ShotAngles.HIGH,             label: "High" },
      { value: ShotAngles.EYE,              label: "Eye" },
      { value: ShotAngles.LOW,              label: "Low" },
      { value: ShotAngles.WORMS_EYE,        label: "Worm\'s Eye" }
    ]
    
    return <div className="camera-inspector">
            <div className="camera-item roll">
                <div className="camera-item-control">
                    <div className="row">
                        <div className="camera-item-button" {...useLongPress(getValueShifter({roll: -THREE.Math.DEG2RAD}))}><div className="arrow left"/></div>
                        <div className="camera-item-button" {...useLongPress(getValueShifter({roll: THREE.Math.DEG2RAD}))}><div className="arrow right"/></div> 
                    </div>
                </div>
                <div className="camera-item-label">Roll: { cameraRoll }°</div>
            </div>
            <div className="camera-item pan">
                <div className="camera-item-control">
                    <div className="row">
                        <div className="pan-control" {...getCameraPanEvents()}><div className="pan-control-target"/></div>
                    </div>
                </div>
                <div className="camera-item-label">Pan: { cameraPan }° // Tilt: { cameraTilt }°</div>
            </div>
            <div className="camera-item move">
                <div className="camera-item-control"> 
                    <div className="row" style={{ justifyContent: "center" }}>
                        <div className="camera-item-button" {...useLongPress(moveCamera([0, -0.1]))}><div className="arrow up"/></div>
                    </div>
                    <div className="row"> 
                        <div className="camera-item-button" {...useLongPress(moveCamera([-0.1, 0]))}><div className="arrow left"/></div> 
                        <div className="camera-item-button" {...useLongPress(moveCamera([0, 0.1]))}><div className="arrow down"/></div> 
                        <div className="camera-item-button" {...useLongPress(moveCamera([0.1, 0]))}><div className="arrow right"/></div> 
                    </div>
                </div>
                <div className="camera-item-label">Move</div>
            </div>
            <div className="camera-item elevate">
                <div className="camera-item-control">
                    <div className="row"> 
                        <div className="camera-item-button" {...useLongPress(getValueShifter({z: 0.1}))}><div className="arrow up"/></div> 
                    <div className="row"> 
                    </div>
                        <div className="camera-item-button" {...useLongPress(getValueShifter({z: -0.1}))}><div className="arrow down"/></div> 
                    </div>
                </div> 
                <div className="camera-item-label">Elevate: { cameraState.z.toFixed(2) }m</div> 
            </div>
            <div className="camera-item lens">
                <div className="camera-item-control">
                    <div className="row"> 
                        <div className="camera-item-button" {...useLongPress(getValueShifter({fov: 0.2}))}><div className="arrow left"/></div> 
                        <div className="camera-item-button" {...useLongPress(getValueShifter({fov: -0.2}))}><div className="arrow right"/></div> 
                    </div>
                </div>
                <div className="camera-item-label">Lens: ${ focalLength.toFixed(2) }mm</div>
            </div>
            <div className="camera-item shots">
                <div className="select">
                    <Select 
                        label="Shot Size"
                        value={ shotSizes.find(option => option.value === currentShotSize) }
                        options={ shotSizes }
                        onSetValue={ (item) => onSetShot({ size: item.value, angle: shotInfo.angle }) }/>
                </div>
                <div className="select">
                    <Select 
                        label="Camera Angle"
                        value={ shotAngles.find(option => option.value === currentShotAngle) }
                        options={ shotAngles }
                        onSetValue={ (item) => onSetShot({ size: shotInfo.size, angle: item.value }) }/>
                </div>
            </div>
        </div>
  }
))

export default CameraPanelInspector
