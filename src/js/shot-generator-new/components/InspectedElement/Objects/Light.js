import React, {useCallback} from "react";
import {Math as _Math} from "three";
import {formatters, NumberSlider, transforms} from "../../NumberSlider";
import ColorSelect from "../../ColorSelect";

const LightInspector = React.memo(({updateObject, sceneObject}) => {
  const {id, ...props} = sceneObject

  const setX = useCallback((x) => updateObject(id, {x}), [])
  const setY = useCallback((y) => updateObject(id, {y}), [])
  const setZ = useCallback((z) => updateObject(id, {z}), [])

  const setIntensity = useCallback((intensity) => updateObject(id, {intensity}), [])
  const setDistance = useCallback((distance) => updateObject(id, {distance}), [])
  const setPenumbra = useCallback((penumbra) => updateObject(id, {penumbra}), [])
  const setDecay = useCallback((decay) => updateObject(id, {decay}), [])

  const setAngle = useCallback((angle) => updateObject(id, {angle: _Math.degToRad(angle)}), [])
  const setRotation = useCallback((value) => updateObject(id, {rotation: THREE.Math.degToRad(value)}), [])
  const setTilt = useCallback((value) => updateObject(id, {tilt: THREE.Math.degToRad(value)}), [])

  return (
    <React.Fragment>
      <NumberSlider label='X' value={props.x} min={-30} max={30} onSetValue={setX}/>
      <NumberSlider label='Y' value={props.y} min={-30} max={30} onSetValue={setY}/>
      <NumberSlider label='Z' value={props.z} min={-30} max={30} onSetValue={setZ}/>

      <NumberSlider label='Intensity' value={props.intensity} min={0.025} max={1} onSetValue={setIntensity}/>

      <NumberSlider
        label='Angle'
        value={_Math.radToDeg(props.angle)}
        min={1}
        max={90}
        step={1}
        onSetValue={setAngle}
        transform={transforms.degrees}
        formatter={formatters.degrees}
      />

      <NumberSlider label='Distance' value={props.distance} min={0.025} max={100} onSetValue={setDistance}/>
      <NumberSlider label='Penumbra' value={props.penumbra} min={0} max={1} onSetValue={setPenumbra}/>
      <NumberSlider label='Decay' value={props.decay} min={1} max={2} onSetValue={setDecay}/>

      <NumberSlider
        label='Rotation'
        value={_Math.radToDeg(props.rotation)}
        min={-180}
        max={180}
        step={1}
        onSetValue={setRotation}
        transform={transforms.degrees}
        formatter={formatters.degrees}
      />

      <NumberSlider
        label='Tilt'
        value={_Math.radToDeg(props.tilt)}
        min={-90}
        max={90}
        step={1}
        onSetValue={setTilt}
        transform={transforms.degrees}
        formatter={formatters.degrees}
      />
    </React.Fragment>
  )
})

export default LightInspector