import React, {useCallback} from "react";
import {Math as _Math} from "three";
import {formatters, NumberSlider, transforms} from "../../NumberSlider";
import ColorSelect from "../../ColorSelect";

const ObjectInspector = React.memo(({updateObject, sceneObject}) => {
  const {id, ...props} = sceneObject

  const setX = useCallback((x) => updateObject(id, {x}), [])
  const setY = useCallback((y) => updateObject(id, {y}), [])
  const setZ = useCallback((z) => updateObject(id, {z}), [])

  const setWidth = useCallback((width) => updateObject(id, {width}), [])
  const setHeight = useCallback((height) => updateObject(id, {height}), [])
  const setDepth = useCallback((depth) => updateObject(id, {depth}), [])

  const setRotateX = useCallback((x) => updateObject(id, { rotation: {x: _Math.degToRad(x)} }), [])
  const setRotateY = useCallback((z) => updateObject(id, { rotation: {z: _Math.degToRad(z)} }), [])
  const setRotateZ = useCallback((y) => updateObject(id, { rotation: {y: _Math.degToRad(y)} }), [])

  const setTintColor = useCallback((tintColor) => updateObject(id, {tintColor}), [])

  return (
    <React.Fragment>
      <NumberSlider label='X' value={props.x} min={-30} max={30} onSetValue={setX}/>
      <NumberSlider label='Y' value={props.y} min={-30} max={30} onSetValue={setY}/>
      <NumberSlider label='Z' value={props.z} min={-30} max={30} onSetValue={setZ}/>

      <NumberSlider label='Width' value={props.width} min={0.025} max={5} onSetValue={setWidth}/>
      <NumberSlider label='Height' value={props.height} min={0.025} max={5} onSetValue={setHeight}/>
      <NumberSlider label='Depth' value={props.depth} min={0.025} max={5} onSetValue={setDepth}/>

      <NumberSlider
        label='Rotate X'
        value={_Math.radToDeg(props.rotation.x)}
        min={-180}
        max={180}
        step={1}
        onSetValue={setRotateX}
        transform={transforms.degrees}
        formatter={formatters.degrees}
      />

      <NumberSlider
        label='Rotate Y'
        value={_Math.radToDeg(props.rotation.z)}
        min={-180}
        max={180}
        step={1}
        onSetValue={setRotateY}
        transform={transforms.degrees}
        formatter={formatters.degrees}
      />

      <NumberSlider
        label='Rotate Z'
        value={_Math.radToDeg(props.rotation.y)}
        min={-180}
        max={180}
        step={1}
        onSetValue={setRotateZ}
        transform={transforms.degrees}
        formatter={formatters.degrees}
      />

      <ColorSelect
        label='Tint color'
        value={props.tintColor}
        onSetValue={setTintColor}
      />
    </React.Fragment>
  )
})

export default ObjectInspector