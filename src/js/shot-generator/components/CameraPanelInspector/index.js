import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import { connect } from 'react-redux'
import * as THREE from 'three'
import {
    updateObject,
    setCameraShot,
    selectObject,
    setMainViewCamera,
    getSceneObjects,
    getActiveCamera,
} from '../../../shared/reducers/shot-generator'
import useLongPress from '../../../hooks/use-long-press'
import Select from '../Select'
import { ipcRenderer } from 'electron'
import CameraControls from '../../CameraControls'
import { ShotSizes, ShotAngles } from '../../utils/cameraUtils'
import { useDrag } from 'react-use-gesture'

import KeyCommandsSingleton from '../KeyHandler/KeyCommandsSingleton'

import useTooltip from '../../../hooks/use-tooltip'
import { useTranslation } from 'react-i18next'
/**
 * Return the first index containing an *item* which is greater than *item*.
 * @arguments _(item)_
 * @example
 *  indexOfGreaterThan([10, 5, 77, 55, 12, 123], 70) // => 2
 * via mohayonao/subcollider
 */
const indexOfGreaterThan = (array, item) => {
  for (var i = 0, imax = array.length; i < imax; ++i) {
    if (array[i] > item) { return i }
  }
  return -1
}
/**
 * Returns the closest index of the value in the array (collection must be sorted).
 * @arguments _(item)_
 * @example
 *  indexIn([2, 3, 5, 6], 5.2) // => 2
 * via mohayonao/subcollider
 */
const indexIn = (array, item) => {
  var i, j = indexOfGreaterThan(array, item)
  if (j === -1) { return array.length - 1 }
  if (j ===  0) { return j }
  i = j - 1
  return ((item - array[i]) < (array[j] - item)) ? i : j
}


const CameraPanelInspector = connect(
    state => ({
      activeCamera: getSceneObjects(state)[getActiveCamera(state)],
      cameraShots: state.cameraShots,
      mainViewCamera: state.mainViewCamera,
    }),
    {
      updateObject,
      setCameraShot,
      selectObject,
      setMainViewCamera
    }
)(
  React.memo(({
      activeCamera,
      cameraShots,
      updateObject,
      setCameraShot,
      setMainViewCamera,
      selectObject,
      mainViewCamera,
    }) => {
    if (!activeCamera) return <div className="camera-inspector"/>

    const shotInfo = cameraShots[activeCamera.id] || {}
    const [currentShotSize, setCurrentShotSize] = useState(shotInfo.size)
    const [currentShotAngle, setCurrentShotAngle] = useState(shotInfo.angle)
    const isDragging = useRef(false)
    const dragInfo = useRef({prev: [0, 0], current: [0, 0]})
    const { t } = useTranslation()
    const fakeCamera = useRef()
    useEffect(() => {
      setCurrentShotSize(shotInfo.size)
    }, [shotInfo.size, activeCamera])

    useEffect(() => {
      setCurrentShotAngle(shotInfo.angle)
    }, [shotInfo.angle, activeCamera])

    useEffect(() => {
      KeyCommandsSingleton.getInstance().addKeyCommand({ key: "t", value: () => setMainViewCamera(mainViewCamera === 'ortho' ? 'live' : 'ortho') })
      return () => {
        KeyCommandsSingleton.getInstance().removeKeyCommand({ key: "t", value: () => setMainViewCamera(mainViewCamera === 'ortho' ? 'live' : 'ortho') })
      }
    }, [mainViewCamera])

    useEffect(() => {
      KeyCommandsSingleton.getInstance().addKeyCommand({ key: "Escape", value: () => selectObject(activeCamera) })
      return () => {
        KeyCommandsSingleton.getInstance().removeKeyCommand({ key: "Escape", value: () =>  selectObject(activeCamera) })
      }
    }, [activeCamera])

    let cameraInfo = useRef({...activeCamera})
    let [cameraRoll, setCameraRoll] = useState(activeCamera.roll)
    let [cameraTilt, setCameraTilt] = useState(activeCamera.tilt)
    let [cameraPan, setCameraPan] = useState(activeCamera.rotation)
    let cameraState = { ...activeCamera }
    useEffect(() => {
      if(isDragging.current) return
      cameraInfo.current.roll = Math.round(THREE.Math.radToDeg(activeCamera.roll))
      setCameraRoll(cameraInfo.current.roll)
    }, [activeCamera.roll])

    useEffect(() => {
      if(isDragging.current) return
      cameraInfo.current.rotation = Math.round(THREE.Math.radToDeg(activeCamera.rotation))
      setCameraPan(cameraInfo.current.rotation)
    }, [activeCamera.rotation])

    useEffect(() => {
      if(isDragging.current) return
      cameraInfo.current.tilt = Math.round(THREE.Math.radToDeg(activeCamera.tilt))
      setCameraTilt(cameraInfo.current.tilt)
    }, [activeCamera.tilt])

    const getValueShifter = (draft) => () => {
      for (let [k, v] of Object.entries(draft)) {
        cameraState[k] += v
      }
      updateObject(activeCamera.id, cameraState)
    }

    const fovs = useMemo(() => {
      const mms = [12, 16, 18, 22, 24, 35, 50, 85, 100, 120, 200, 300, 500]
      fakeCamera.current = fakeCamera.current || new THREE.PerspectiveCamera(activeCamera.fov,  2.348927875243665)
      return mms.map(mm => {
        fakeCamera.current.setFocalLength(mm)
        return fakeCamera.current.fov
      }).sort((a, b) => a - b)
    }, [])


    const switchCameraFocalLength = useCallback((iterator) => {
      let index = indexIn(fovs, activeCamera.fov)
      let switchTo = index + iterator
      let fov = fovs[Math.max(Math.min(switchTo, fovs.length - 1), 0)]
      fakeCamera.current.fov = fov
      updateObject(activeCamera.id, { fov })
    }, [activeCamera] )

    const focalLength = useMemo(() => {
      if(!fakeCamera.current) return
      fakeCamera.current.fov = activeCamera.fov
      return fakeCamera.current.getFocalLength()
    }, [activeCamera.fov])


    const rollCamera = useCallback((event) => {
      let cameraState = activeCamera
      let roll = {
        'z': Math.max(cameraState.roll - THREE.Math.DEG2RAD, -45 * THREE.Math.DEG2RAD),
        'x': Math.min(cameraState.roll + THREE.Math.DEG2RAD, 45 * THREE.Math.DEG2RAD)
      }[event.key]

      updateObject(activeCamera.id, { roll })
    }, [activeCamera])

    useEffect(() => {
      KeyCommandsSingleton.getInstance().addKeyCommand({
        key: "cameraRoll",
        keyCustomCheck: (event) => (event.key === 'z' || event.key === 'x') &&
                            !event.shiftKey &&
                            !event.metaKey &&
                            !event.ctrlKey &&
                            !event.altKey && 
                            !event.mousePressed,
        value: (event) => { rollCamera(event) }
      })
      return () => KeyCommandsSingleton.getInstance().removeKeyCommand({ key: "cameraRoll" })
    }, [activeCamera, rollCamera])

    useEffect(() => {
      KeyCommandsSingleton.getInstance().addKeyCommand({ key: "[", value:  () => switchCameraFocalLength( 1 ) })
      return () => {
        KeyCommandsSingleton.getInstance().removeKeyCommand({ key: "[" })
      }
    }, [switchCameraFocalLength])

    useEffect(() => {
      KeyCommandsSingleton.getInstance().addKeyCommand({ key: "]", value:  () => switchCameraFocalLength( -1 ) })
      return () => {
        KeyCommandsSingleton.getInstance().removeKeyCommand({ key: "]" })
      }
    }, [switchCameraFocalLength])

    const moveCamera = ([speedX, speedY]) => () => {
      cameraState = CameraControls.getMovedState(cameraState, { x: speedX, y: speedY })
      updateObject(activeCamera.id, cameraState)
    }

    useEffect(() => {
      if (!cameraInfo.current) return
      let requestID = null
      const onFrame = () => {
        if (dragInfo.current.prev[0] !== dragInfo.current.current[0] || dragInfo.current.prev[1] !== dragInfo.current.current[1]) {
          const [dx, dy] = dragInfo.current.current

          let newPan = cameraInfo.current.rotation - dx
          let newTilt = cameraInfo.current.tilt - dy

          cameraInfo.current.rotation = newPan
          cameraInfo.current.tilt = newTilt

          let rotation = THREE.Math.degToRad(newPan)
          let tilt = THREE.Math.degToRad(newTilt)

          updateObject(activeCamera.id, {rotation, tilt})
        }

        dragInfo.current.prev[0] = dragInfo.current.current[0]
        dragInfo.current.prev[1] = dragInfo.current.current[1]
        requestID = requestAnimationFrame(onFrame)
      }

      requestID = requestAnimationFrame(onFrame)

      return () => {
        cancelAnimationFrame(requestID)
      }
    }, [cameraInfo.current, activeCamera.id])

    const getCameraPanEvents = useDrag(({first, last, vxvy }) => {
      dragInfo.current.current = vxvy

      if (first) {
        isDragging.current = true
      } else if (last) {
        isDragging.current = false
      }
    })

    const onSetShot = ({size, angle}) => {
      setCameraShot(activeCamera.id, {size, angle})
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

    const rollTooltipEvents = useTooltip(t("shot-generator.camera-panel.roll-camera.title"), t("shot-generator.camera-panel.roll-camera.description"), "Z|X", "top center")
    const panTooltipEvents = useTooltip(t("shot-generator.camera-panel.pan-tilt-camera.title"), t("shot-generator.camera-panel.pan-tilt-camera.description"), null, "top center")
    const moveTooltipEvents = useTooltip(t("shot-generator.camera-panel.move-camera.title"), t("shot-generator.camera-panel.move-camera.description"), "W+A+S+D", "top center")
    const elevateTooltipEvents = useTooltip(t("shot-generator.camera-panel.elevate-camera.title"), t("shot-generator.camera-panel.elevate-camera.description"), "R|F", "top center")
    const lensTooltipEvents = useTooltip(t("shot-generator.camera-panel.change-camera-lens.title"), t("shot-generator.camera-panel.change-camera-lens.description"), "[|]", "top center")
    const shotsizeTooltipEvents = useTooltip(t("shot-generator.camera-panel.auto-shot-framing.title"), t("shot-generator.camera-panel.auto-shot-framing.description"), null, "top center")

    return <div className="camera-inspector">
            <div className="camera-item roll" {...rollTooltipEvents}>
                <div className="camera-item-control">
                    <div className="row">
                        <div className="camera-item-button" {...useLongPress(getValueShifter({ roll: -THREE.Math.DEG2RAD }))}><div className="arrow left"/></div>
                        <div className="camera-item-button" {...useLongPress(getValueShifter({ roll: THREE.Math.DEG2RAD }))}><div className="arrow right"/></div>
                    </div>
                </div>
                <div className="camera-item-label">{t("shot-generator.camera-panel.roll")}: { cameraRoll }°</div>
            </div>
            <div className="camera-item pan" {...panTooltipEvents}>
                <div className="camera-item-control">
                    <div className="row">
                        <div className="pan-control" {...getCameraPanEvents()}><div className="pan-control-target"/></div>
                    </div>
                </div>
                <div className="camera-item-label">{t("shot-generator.camera-panel.pan")}: { Math.round(THREE.Math.radToDeg(activeCamera.rotation)) }° // {t("shot-generator.camera-panel.tilt")}: { Math.round(THREE.Math.radToDeg(activeCamera.tilt)) }°</div>
            </div>
            <div className="camera-item move" {...moveTooltipEvents}>
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
                <div className="camera-item-label">{t("shot-generator.camera-panel.move")}</div>
            </div>
            <div className="camera-item elevate" {...elevateTooltipEvents}>
                <div className="camera-item-control">
                    <div className="row">
                        <div className="camera-item-button" {...useLongPress(getValueShifter({ z: 0.1 }))}><div className="arrow up"/></div>
                    <div className="row">
                    </div>
                        <div className="camera-item-button" {...useLongPress(getValueShifter({ z: -0.1 }))}><div className="arrow down"/></div>
                    </div>
                </div>
                <div className="camera-item-label">{t("shot-generator.camera-panel.elevate")}: { activeCamera.z.toFixed(2) }m</div>
            </div>
            <div className="camera-item lens" {...lensTooltipEvents}>

                <div className="camera-item-control">
                    <div className="row">
                        <div className="camera-item-button" {...useLongPress(getValueShifter({ fov: 0.2 }))}><div className="arrow left"/></div>
                        <div className="camera-item-button" {...useLongPress(getValueShifter({ fov: -0.2 }))}><div className="arrow right"/></div>
                    </div>
                </div>
                <div className="camera-item-label">{t("shot-generator.camera-panel.lens")}: { focalLength.toFixed(2) }mm</div>
            </div>
            <div className="camera-item shots" {...shotsizeTooltipEvents}>
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
                <div className="select">
                  <div className="select-shot-explorer" onPointerDown={ () => ipcRenderer.send('shot-generator:show:shot-explorer')}>
                      <a className="select-shot-explorer-text">
                     {t("shot-generator.camera-panel.open-shot-explorer")}
                      </a>
                    </div>
                </div>
            </div>
        </div>
  }
))

export default CameraPanelInspector
