import { ipcRenderer } from 'electron'
import React, {useCallback} from 'react'
import {Math as _Math} from 'three'
import {formatters, NumberSlider, transforms, textFormatters, textConstraints} from '../../NumberSlider'
import ColorSelect from '../../ColorSelect'
import { useTranslation } from 'react-i18next'
const ObjectInspector = React.memo(({updateObject, sceneObject}) => {
  const {id, ...props} = sceneObject
  const { t } = useTranslation()
  const setX = useCallback((x) => updateObject(id, {x}), [])
  const setY = useCallback((y) => updateObject(id, {y}), [])
  const setZ = useCallback((z) => updateObject(id, {z}), [])

  const setWidth = useCallback((width) => updateObject(id, {width}), [])
  const setHeight = useCallback((height) => updateObject(id, {height}), [])
  const setDepth = useCallback((depth) => updateObject(id, {depth}), [])
  const setSize = useCallback((size) => updateObject(id, {width:size, height:size, depth:size}), [])

  const setRotateX = useCallback((x) => updateObject(id, { rotation: {x: _Math.degToRad(x)} }), [])
  const setRotateY = useCallback((z) => updateObject(id, { rotation: {z: _Math.degToRad(z)} }), [])
  const setRotateZ = useCallback((y) => updateObject(id, { rotation: {y: _Math.degToRad(y)} }), [])

  const setTintColor = useCallback((tintColor) => updateObject(id, {tintColor}), [])

  return (
    <React.Fragment>
      <NumberSlider label="X" value={props.x} min={-30} max={30} onSetValue={setX} textFormatter={ textFormatters.imperialToMetric }/>
      <NumberSlider label="Y" value={props.y} min={-30} max={30} onSetValue={setY} textFormatter={ textFormatters.imperialToMetric }/>
      <NumberSlider label="Z" value={props.z} min={-30} max={30} onSetValue={setZ} textFormatter={ textFormatters.imperialToMetric }/>

      { sceneObject.model === "box" &&  <NumberSlider label={t("shot-generator.inspector.common.width")} value={props.width} min={0.025} max={5} onSetValue={setWidth} textFormatter={ textFormatters.imperialToMetric } textConstraint={ textConstraints.sizeConstraint }/> }
      { sceneObject.model === "box" &&  <NumberSlider label={t("shot-generator.inspector.common.height")} value={props.height} min={0.025} max={5} onSetValue={setHeight} textFormatter={ textFormatters.imperialToMetric } textConstraint={ textConstraints.sizeConstraint }/>}
      { sceneObject.model === "box" &&  <NumberSlider label={t("shot-generator.inspector.common.depth")} value={props.depth} min={0.025} max={5} onSetValue={setDepth} textFormatter={ textFormatters.imperialToMetric } textConstraint={ textConstraints.sizeConstraint }/> }
      { sceneObject.model !== "box" &&  <NumberSlider label={t("shot-generator.inspector.common.size")} value={props.depth} min={0.025} max={5} onSetValue={setSize} textFormatter={ textFormatters.imperialToMetric } textConstraint={ textConstraints.sizeConstraint }/> }

      <NumberSlider
        label={t("shot-generator.inspector.common.rotate-x")}
        value={_Math.radToDeg(props.rotation.x)}
        min={-180}
        max={180}
        step={1}
        onSetValue={setRotateX}
        transform={transforms.degrees}
        formatter={formatters.degrees}
      />

      <NumberSlider
        label={t("shot-generator.inspector.common.rotate-y")}
        value={_Math.radToDeg(props.rotation.z)}
        min={-180}
        max={180}
        step={1}
        onSetValue={setRotateY}
        transform={transforms.degrees}
        formatter={formatters.degrees}
      />

      <NumberSlider
        label={t("shot-generator.inspector.common.rotate-z")}
        value={_Math.radToDeg(props.rotation.y)}
        min={-180}
        max={180}
        step={1}
        onSetValue={setRotateZ}
        transform={transforms.degrees}
        formatter={formatters.degrees}
      />

      <ColorSelect
        label={t("shot-generator.inspector.common.tint-color")}
        value={props.tintColor}
        onSetValue={setTintColor}
      />
      <div className="drop_button__wrappper">
        <div className="drop_button" onClick={ () => ipcRenderer.send('shot-generator:object:drops')}>
        {t("shot-generator.inspector.object.drop-object")}
        </div>
      </div>
    </React.Fragment>
  )
})

export default ObjectInspector