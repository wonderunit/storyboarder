import React, {useCallback} from "react";
import {Math as _Math} from "three";
import {formatters, NumberSlider, transforms} from "../../NumberSlider";
//import Select from "../../../Select";

const VolumeInspector = React.memo(({updateObject, sceneObject}) => {
  const {id, ...props} = sceneObject

  const setX = useCallback((x) => updateObject(id, {x}), [])
  const setY = useCallback((y) => updateObject(id, {y}), [])
  const setZ = useCallback((z) => updateObject(id, {z}), [])

  const setWidth = useCallback((width) => updateObject(id, {width}), [])
  const setHeight = useCallback((height) => updateObject(id, {height}), [])
  const setDepth = useCallback((depth) => updateObject(id, {depth}), [])
  
  const setLayers = useCallback((numberOfLayers) => updateObject(id, {numberOfLayers}), [])
  const setOpacity = useCallback((opacity) => updateObject(id, {opacity}), [])
  const setColor = useCallback((value) => {
    let c = 0xFF * value
    let color = (c << 16) | (c << 8) | c
    
    updateObject(id, {color})
  }, [])

  const setRotation = useCallback((x) => updateObject(id, { rotation: _Math.degToRad(x) }), [])
  
  const selectOptions = [
    {
      label: 'Custom',
      options: []
    },
    {
      label: 'Built-in',
      options: [
        {label: 'rain', value: 'rain1,rain2'},
        {label: 'fog', value: 'fog1,fog2'},
        {label: 'explosion', value: 'debris,explosion'}
      ]
    }
  ]

  return (
    <React.Fragment>
      <NumberSlider label='X' value={props.x} min={-30} max={30} onSetValue={setX}/>
      <NumberSlider label='Y' value={props.y} min={-30} max={30} onSetValue={setY}/>
      <NumberSlider label='Z' value={props.z} min={-30} max={30} onSetValue={setZ}/>

      <NumberSlider label='Width' value={props.width} min={0.025} max={5} onSetValue={setWidth}/>
      <NumberSlider label='Height' value={props.height} min={0.025} max={5} onSetValue={setHeight}/>
      <NumberSlider label='Depth' value={props.depth} min={0.025} max={5} onSetValue={setDepth}/>
      
      <div className='input-group'>
        <div className="input-group__label">
          Layer Image Files
        </div>
        {/*<Select
          label='Select Layer Images'
          value={null}
          options={selectOptions}
          className='input-group__input'
        />*/}
      </div>
      
      <NumberSlider label='Layers' value={props.numberOfLayers} min={1} max={10} step={1} onSetValue={setLayers}/>
      <NumberSlider label='Opacity' value={props.opacity} min={0} max={1} onSetValue={setOpacity}/>
      <NumberSlider label='Color' value={props.color/0xFFFFFF} min={0} max={1} onSetValue={setColor}/>
      
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
    </React.Fragment>
  )
})

export default VolumeInspector