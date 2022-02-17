import React, {useCallback, useState} from "react";
import {Math as _Math} from "three";
const remote = require('@electron/remote')
import path from 'path'
import fs from 'fs-extra'
const { dialog } = remote
import {formatters, NumberSlider, transforms, textFormatters, textConstraints} from '../../NumberSlider'
import Select from '../../Select'
import { useTranslation } from 'react-i18next'
const selectOptions = [
  {
    label: "Custom",
    options: [
      { label: "Custom....", value: "custom" }
    ]
  },
  {
    label: "Built-in",
    options: [
      { label: "Rain", value: "rain1,rain2" },
      { label: "Fog", value: "fog1,fog2" },
      { label: "Explosion", value: "debris,explosion" }
    ]
  }
]

const createLabel = (ids) => {
  return ids.map(s => path.basename(s)).join(', ');
} 

const VolumeInspector = React.memo(({updateObject, sceneObject, storyboarderFilePath}) => {
  const {id, ...props} = sceneObject
  const { t } = useTranslation()
  const currentSelectedOption = () => {
    let builtInOptions = Object.values(Object.values(selectOptions)[1].options)
    let builtInOption = builtInOptions.find(object => object.value.includes(sceneObject.volumeImageAttachmentIds[0]))
    if(!builtInOption) {
      return {label: createLabel(sceneObject.volumeImageAttachmentIds), value: sceneObject.volumeImageAttachmentIds }
    } else {
      return builtInOption
    }
  } 

  const [selectedFile, setSelectedFile] = useState(currentSelectedOption())
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

  const selectAttachment = (item) => {
    let selected = item.value
    let ids = ""
    if (selected === "custom") {
      dialog.showOpenDialog(null, { properties: ["openFile", "multiSelections"] })
      .then(({ filePaths }) => {
        if (filePaths) {
          ids = copyFiles(filePaths)

          if (ids.length) {
            updateObject(sceneObject.id, { volumeImageAttachmentIds: ids })
            setSelectedFile({label: createLabel(ids), value: ids})
          }
        }
      })
      .catch(err => console.error(err))

    } else {
      setSelectedFile(item)
      // convert value string to ids
      ids = selected.split(',')
      updateObject(sceneObject.id, { volumeImageAttachmentIds: ids })
    }
  }

  const copyFiles = (filepaths) => {
    let projectDir = path.dirname(storyboarderFilePath)
    let assetsDir = path.join(projectDir, 'models', 'volumes')
    fs.ensureDirSync(assetsDir)

    let dsts = []
    //console.log(dsts)
    for (let src of filepaths) {
      let dst = path.join(assetsDir, path.basename(src))
     // console.log('copying from', src, 'to', dst)
      try {
        fs.copySync(src, dst)
        dsts.push(dst)
      } catch (err) {
        //console.error('could not copy', src)
        alert('could not copy ' + src)
      }
    }

    let ids = dsts.map(filepath => path.relative(projectDir, filepath))
    //console.log('setting attachment ids', ids)

    return ids
  }

  const setRotation = useCallback((x) => updateObject(id, { rotation: _Math.degToRad(x) }), [])

  return (
    <React.Fragment>
      <NumberSlider label="X" value={props.x} min={-30} max={30} onSetValue={setX} textFormatter={ textFormatters.imperialToMetric }/>
      <NumberSlider label="Y" value={props.y} min={-30} max={30} onSetValue={setY} textFormatter={ textFormatters.imperialToMetric }/>
      <NumberSlider label="Z" value={props.z} min={-30} max={30} onSetValue={setZ} textFormatter={ textFormatters.imperialToMetric }/>

      <NumberSlider label={t("shot-generator.inspector.common.width")} value={props.width} min={0.025} max={5} onSetValue={setWidth} textFormatter={ textFormatters.imperialToMetric } textConstraint={ textConstraints.sizeConstraint }/>
      <NumberSlider label={t("shot-generator.inspector.common.height")} value={props.height} min={0.025} max={5} onSetValue={setHeight} textFormatter={ textFormatters.imperialToMetric } textConstraint={ textConstraints.sizeConstraint }/>
      <NumberSlider label={t("shot-generator.inspector.common.depth")} value={props.depth} min={0.025} max={5} onSetValue={setDepth} textFormatter={ textFormatters.imperialToMetric } textConstraint={ textConstraints.sizeConstraint }/>
      
      <div className="input-group">
        <div className="input-group__label">
        {t("shot-generator.inspector.volume.layer-image-files")}
        </div>
    
        <div className="input-group__input">
          <Select
            label={t("shot-generator.inspector.volume.select-layer-images")}
            value={{
              label:selectedFile.label,
              value: selectedFile.value
            }}
            options={ selectOptions }
            onSetValue={(item) => { selectAttachment(item) }}
            />
        </div>
      </div>
      
      <NumberSlider label={t("shot-generator.inspector.volume.layers")} value={props.numberOfLayers} min={1} max={10} step={1} onSetValue={setLayers}/>
      <NumberSlider label={t("shot-generator.inspector.common.opacity")}value={props.opacity} min={0} max={1} onSetValue={setOpacity}/>
      <NumberSlider label={t("shot-generator.inspector.volume.color")} value={props.color/0xFFFFFF} min={0} max={1} onSetValue={setColor}/>
      
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
    </React.Fragment>
  )
})

export default VolumeInspector