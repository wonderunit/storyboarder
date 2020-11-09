import React, {useCallback} from 'react'
import {Math as _Math} from 'three'
import {formatters, NumberSlider, transforms, textFormatters} from '../../NumberSlider'
import { useTranslation } from 'react-i18next'
const CameraInspector = React.memo(({updateObject, sceneObject}) => {
  const {id, ...props} = sceneObject
  const { t } = useTranslation()
  const setX = useCallback((x) => updateObject(id, {x}), [])
  const setY = useCallback((y) => updateObject(id, {y}), [])
  const setZ = useCallback((z) => updateObject(id, {z}), [])

  const setRotation = useCallback((value) => updateObject(id, {rotation: THREE.Math.degToRad(value)}), [])
  const setRoll = useCallback((value) => updateObject(id, {roll: THREE.Math.degToRad(value)}), [])
  const setTilt = useCallback((value) => updateObject(id, {tilt: THREE.Math.degToRad(value)}), [])
  
  const setFOV = useCallback((fov) => updateObject(id, {fov}), [])
  
  const fovFormatter = useCallback((value) => value.toFixed(1) + '°', [])

  return (
    <React.Fragment>
      <NumberSlider label="X" value={props.x} min={-30} max={30} onSetValue={setX} textFormatter={ textFormatters.imperialToMetric }/>
      <NumberSlider label="Y" value={props.y} min={-30} max={30} onSetValue={setY} textFormatter={ textFormatters.imperialToMetric }/>
      <NumberSlider label="Z" value={props.z} min={-30} max={30} onSetValue={setZ} textFormatter={ textFormatters.imperialToMetric }/>

      <NumberSlider
        label={t("shot-generator.inspector.common.rotation")}
        value={_Math.radToDeg(props.rotation)}
        min={-180}
        max={180}
        step={1}
        onSetValue={setRotation}
        transform={transforms.degrees}
        formatter={formatters.degrees}
      />

      <NumberSlider
        label={t("shot-generator.inspector.common.roll")}
        value={_Math.radToDeg(props.roll)}
        min={-45}
        max={45}
        step={1}
        onSetValue={setRoll}
        transform={transforms.degrees}
        formatter={formatters.degrees}
      />

      <NumberSlider
        label={t("shot-generator.inspector.common.tilt")}
        value={_Math.radToDeg(props.tilt)}
        min={-90}
        max={90}
        step={1}
        onSetValue={setTilt}
        transform={transforms.degrees}
        formatter={formatters.degrees}
      />

      <NumberSlider
        label={t("shot-generator.inspector.camera.fov")}
        value={props.fov}
        min={1}
        max={120}
        step={1}
        onSetValue={setFOV}
        formatter={fovFormatter}
      />
      
    </React.Fragment>
  )
})

export default CameraInspector