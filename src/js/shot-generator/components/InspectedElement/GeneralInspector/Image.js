import React, {useCallback} from 'react'
import {Math as _Math} from 'three'

import fs from 'fs-extra'
import path from 'path'

import {formatters, NumberSlider, transforms, textFormatters, textConstraints} from '../../NumberSlider'

import FileInput from '../../FileInput'
import Checkbox from '../../Checkbox'
import { useTranslation } from 'react-i18next'
const loadImages = (files, baseDir) => {
  return new Promise((resolve, reject) => {
    let projectDir = path.dirname(baseDir)
    let assetsDir = path.join(projectDir, 'models', 'images')
    fs.ensureDirSync(assetsDir)

    let dsts = []
    for (let src of files) {
      let dst = path.join(assetsDir, path.basename(src))
      try {
        fs.copySync(src, dst)
        dsts.push(dst)
      } catch (err) {
        reject(src)
      }
    }

    let ids = dsts.map(filepath => path.relative(projectDir, filepath))
    
    resolve(ids)
  })
}

const ImageInspector = React.memo(({updateObject, sceneObject, storyboarderFilePath}) => {
  const {id, ...props} = sceneObject
  const { t } = useTranslation()
  const setX = useCallback((x) => updateObject(id, {x}), [])
  const setY = useCallback((y) => updateObject(id, {y}), [])
  const setZ = useCallback((z) => updateObject(id, {z}), [])
  
  const setSize = useCallback((height) => updateObject(id, {height}), [])

  const setRotateX = useCallback((x) => updateObject(id, { rotation: {x: _Math.degToRad(x)} }), [])
  const setRotateY = useCallback((z) => updateObject(id, { rotation: {z: _Math.degToRad(z)} }), [])
  const setRotateZ = useCallback((y) => updateObject(id, { rotation: {y: _Math.degToRad(y)} }), [])

  const setOpacity = useCallback((opacity) => updateObject(id, {opacity}), [])
  
  const setVisibleToCam = useCallback(() => updateObject(id, {visibleToCam: !props.visibleToCam}), [props.visibleToCam])

  const setImageFile = useCallback((event) => {
    if (event.files.length) {
      loadImages(event.files, storyboarderFilePath)
      .then((ids) => {
        updateObject(sceneObject.id, {imageAttachmentIds: ids})
      })
      .catch((src) => alert('could not copy ' + src))
    }
  }, [])

  const imageFileLabel = sceneObject.imageAttachmentIds[0] === 'placeholder'
    ? '(none)' 
    : sceneObject.imageAttachmentIds[0] 
    ? sceneObject.imageAttachmentIds[0].split(/[\\\/]/).pop() 
    : '(none)'

  return (
    <React.Fragment>
      <NumberSlider label="X" value={props.x} min={-30} max={30} onSetValue={setX} textFormatter={ textFormatters.imperialToMetric }/>
      <NumberSlider label="Y" value={props.y} min={-30} max={30} onSetValue={setY} textFormatter={ textFormatters.imperialToMetric }/>
      <NumberSlider label="Z" value={props.z} min={-30} max={30} onSetValue={setZ} textFormatter={ textFormatters.imperialToMetric }/>

      <NumberSlider label={t("shot-generator.inspector.common.scale")} value={props.height} min={0.025} max={5} onSetValue={setSize} textConstraint={ textConstraints.sizeConstraint }/>

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

      <NumberSlider label={t("shot-generator.inspector.common.opacity")} value={props.opacity} min={0.1} max={1} onSetValue={setOpacity}/>

      <FileInput
        onChange={setImageFile}
        label={t("shot-generator.inspector.image.image-file")}
        value={imageFileLabel}
        refClassName="file-input image-file-input"
      />
      
      <Checkbox
        label={t("shot-generator.inspector.image.visible-to-camera")}
        checked={props.visibleToCam}
        onClick={setVisibleToCam}
      />
    </React.Fragment>
  )
})

export default ImageInspector
