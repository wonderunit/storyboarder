import React, {useCallback, useEffect, useMemo, useState} from 'react'
import {Math as _Math} from 'three'

import {connect} from 'react-redux'
import path from 'path'

import HelpButton from './../HelpButton'
import Checkbox from './../Checkbox'
import FileInput from './../FileInput'

import Scrollable from './../Scrollable'

import {NumberSlider, formatters, transforms, textFormatters, textConstraints} from './../NumberSlider'

import {
  updateWorldRoom,
  updateWorldEnvironment,
  updateWorldEnvironmentMap,
  updateWorldFog,
  getWorld,
  getPlatform,
  
  selectObject, deleteObjects, updateObject, updateWorld
} from './../../../shared/reducers/shot-generator'

import deepEqualSelector from './../../../utils/deepEqualSelector'
import CopyFile from '../../utils/CopyFile'
import { useTranslation } from 'react-i18next'
import { CopyFiles, envFilesPatterns} from '../../utils/CopyFiles'
import Select from '../Select'

import {remote} from 'electron'
const {dialog, BrowserWindow} = remote

const savePresetEnv = [
  {value:"sphere", label:"Spherical map"},
  {value:"cube", label:"Cubetexture map"},
  {value:"cross", label:"Croos-horizontal map"},
]

const InspectedWorld = React.memo(({updateObject, updateWorld, updateWorldRoom, updateWorldEnvironment, updateWorldEnvironmentMap,updateWorldFog, world, platform, storyboarderFilePath}) => {

  const [selectedModalEnv, setSelectedModalEnv] = useState(savePresetEnv[0])

  //update drop-down evironment menu after mount component 
  useEffect(()=>{ setSelectedModalEnv(savePresetEnv.find(item => item.value === world.environmentMap.mapType))},[])

  const { t } = useTranslation()
  const setGround = useCallback(() => updateWorld({ground: !world.ground}), [world.ground])
  const setRoomVisible = useCallback(() => updateWorldRoom({visible: !world.room.visible}), [world.room.visible])
  const setEnvVisible = useCallback(() => updateWorldEnvironment({visible: !world.environment.visible}), [world.environment.visible])
  const setEnvMapVisible = useCallback(() => updateWorldEnvironmentMap({visible: !world.environmentMap.visible}), [world.environmentMap.visible])
  const setFogVisible = useCallback(() => updateWorldFog({visible: !world.fog.visible}), [world.fog.visible])

  const setFogDistance = useCallback((far) => updateWorldFog({far}), [])
  
  const setRoomWidth = useCallback((width) => updateWorldRoom({width}), [])
  const setRoomHeight = useCallback((height) => updateWorldRoom({height}), [])
  const setRoomLength = useCallback((length) => updateWorldRoom({length}), [])
  
  const setEnvX = useCallback((x) => updateWorldEnvironment({x}), [])
  const setEnvY = useCallback((y) => updateWorldEnvironment({y}), [])
  const setEnvZ = useCallback((z) => updateWorldEnvironment({z}), [])

  const setEnvMapRotateX = useCallback((x) => updateWorldEnvironmentMap({ rotation: {x: _Math.degToRad(x)} }), [])
  const setEnvMapRotateY = useCallback((z) => updateWorldEnvironmentMap({ rotation: {z: _Math.degToRad(z)} }), [])
  const setEnvMapRotateZ = useCallback((y) => updateWorldEnvironmentMap({ rotation: {y: _Math.degToRad(y)} }), [])
  
  const setEnvScale = useCallback((scale) => updateWorldEnvironment({scale}), [])
  const setEnvRotation = useCallback((rotation) => updateWorldEnvironment({rotation: _Math.radToDeg(rotation)}), [])
  const setEnvModelFile = useCallback((event) => {
    if (event.file) {
      updateWorldEnvironment({file: CopyFile(storyboarderFilePath, event.file, 'environment')})
    }
  }, [])
  const setEnvMapFile = useCallback((event, mapType = null) => {
    if (event.file || (event.files.length>=1) && !event.canceled) {
      const background = CopyFiles({storyboarderFilePath, absolutePathInfo: {...event}, type: 'environment'})
      const sett = background.length ? { background, mapType: mapType || selectedModalEnv.value} : { background }
      updateWorldEnvironmentMap(sett)
    }
  }, [selectedModalEnv])
  const setGrayscale = useCallback(() => updateWorldEnvironment({grayscale: !world.environment.grayscale}), [world.environment.grayscale])
  
  const setAmbientIntensity = useCallback((intensity) => updateWorldEnvironment({intensity}), [])
  const setDirectionalIntensity = useCallback((intensityDirectional) => updateWorldEnvironment({intensityDirectional}), [])
  
  const setDirectionalRotation = useCallback((rotationDirectional) => updateWorldEnvironment({rotationDirectional: _Math.degToRad(rotationDirectional)}), [])
  const setDirectionalTilt = useCallback((tiltDirectional) => updateWorldEnvironment({tiltDirectional: _Math.degToRad(tiltDirectional)}), [])
  
  const setBackground = useCallback((value) => {
    // value is 0..1, scale to component value of 0x00...0xFF (0...255)
    let c = 0xFF * value
    // monochrome
    let backgroundColor = (c << 16) | (c << 8) | c
    updateWorld({backgroundColor})
  }, [])

  useEffect(() => {
    savePresetEnv[0].label = t("shot-generator.inspector.envMap-preset.sphere")
    savePresetEnv[1].label = t("shot-generator.inspector.envMap-preset.cube")
    savePresetEnv[2].label = t("shot-generator.inspector.envMap-preset.cross")
  }, [t])
  
  const EnvironmentModelLabel = useMemo(() => (
      <React.Fragment>
        <span>{t("shot-generator.inspector.inspected-world.file")}</span>
        {
          <HelpButton
            url="https://github.com/wonderunit/storyboarder/wiki/Creating-custom-3D-Models-for-Shot-Generator"
            title={t("shot-generator.inspector.common.object-creation-help")}
            style={{
              marginLeft: 6,
              color: "#eee",
              backgroundColor: "#333",
              width: 16,
              height: 16,
              fontSize: 10
            }}
          />
        }
      </React.Fragment>
  ), [])

  const getEnvironmentLabel = useCallback(({lableName='(none)',helpButtonVisu='visible'}) => (
     <React.Fragment>
      <span>{t(lableName)}</span>
      {(helpButtonVisu ==='visible') ? 
          <HelpButton
            url="https://github.com/wonderunit/storyboarder/wiki/Creating-custom-3D-Models-for-Shot-Generator"
            title={t("shot-generator.inspector.common.object-creation-help")}
            style={{
              marginLeft: 6,
              color: "#eee",
              backgroundColor: "#333",
              width: 16,
              height: 16,
              fontSize: 10
            }}
          /> 
        : null
      }
    </React.Fragment>
  ),[])

  const backgroundMapValue = useMemo(() => (
    !world.environmentMap.background.length ? undefined : 
    (world.environmentMap.background.length>1) ? path.basename(path.dirname(world.environmentMap.background[0])) : 
    path.basename(world.environmentMap.background[0])
  ),[world.environmentMap.background])

  const getDialogSettByEnvType = useCallback((inpType = null) => {

    const filters = [
      { name: 'Images', extensions: envFilesPatterns.avaliableExt },
      { name: 'All', extensions: ['*'] }
    ]

    const type = inpType || selectedModalEnv.value 

    switch (type) {
      case 'sphere':
        return {
          properties: ['openFile'],
          filters 
        }
      case 'cube':
        return {
          properties: platform === 'MAC' ? ['openFile','openDirectory','multiSelections'] : ['openFile','multiSelections'],
          filters 
        }
      case 'cross':
        return {
          properties: ['openFile'],
          filters 
        }
      default: 
        return {
          properties: platform === 'MAC' ? ['openFile','openDirectory','multiSelections'] : ['openFile','multiSelections'],
          filters 
        }
    }

  },[selectedModalEnv, platform, envFilesPatterns]) 

  return (
      <Scrollable>
        <h4 className="inspector-label">{t("shot-generator.inspector.inspected-world.scene")}</h4>
        <div className="inspector-group">
          <div className="inspector-row">
            <Checkbox 
                label={t("shot-generator.inspector.inspected-world.ground")}
                checked={world.ground}
                onClick={setGround}
                style={{opacity: world.room.visible ? 0.5 : 1}}
            />
          </div>

          <div className="inspector-row">
            <NumberSlider
                label={t("shot-generator.inspector.inspected-world.bg-color")}
                value={world.backgroundColor / 0xFFFFFF}
                min={0}
                max={1}
                onSetValue={setBackground}
            />
          </div>

          <div className="inspector-row">
            <div className="input-group">
              <div className="input-group__label">
                {t("shot-generator.inspector.inspected-world.shading-mode")}
              </div>
              <div style={{
                flex: 1,
                textAlign: 'center',
                width: '125px',
                height: '26px',
                fontSize: '13px'
              }}>
                <div style={{ padding: 6 }}>
                  {world.shadingMode}
                </div>
              </div>
            </div>
          </div>
        </div>

        <h5 className="inspector-label">{t("shot-generator.inspector.inspected-world.room")}</h5>

        <div className="inspector-group">
          <div className="inspector-row">
            <Checkbox label={t("shot-generator.inspector.common.visible")} checked={world.room.visible} onClick={setRoomVisible}/>
          </div>

          <div className="inspector-column inspector-offset-row">
            <NumberSlider label={t("shot-generator.inspector.common.width")} value={world.room.width} min={1.83} max={76.2} onSetValue={setRoomWidth} textFormatter={ textFormatters.imperialToMetric } textConstraint={ textConstraints.sizeConstraint }/>
            <NumberSlider label={t("shot-generator.inspector.common.length")} value={world.room.length} min={1.83} max={76.2} onSetValue={setRoomLength} textFormatter={ textFormatters.imperialToMetric } textConstraint={ textConstraints.sizeConstraint }/>
            <NumberSlider label={t("shot-generator.inspector.common.height")} value={world.room.height} min={1.83} max={12.19} onSetValue={setRoomHeight} textFormatter={ textFormatters.imperialToMetric } textConstraint={ textConstraints.sizeConstraint }/>
          </div>
        </div>

        <h5 className="inspector-label">{t("shot-generator.inspector.inspected-world.environmentMap")}</h5>

        <div className="inspector-group">
          <div className="inspector-row">
            <Checkbox label={t("shot-generator.inspector.common.visible")} checked={world.environmentMap.visible} onClick={setEnvMapVisible}/>
          </div>
          <div className="thumbnail-search column">
            <div className="row" style= {{ padding: "6px 0" }} >
                <Select 
                  label={t("shot-generator.inspector.envMap-preset.sphere")}
                  value={ selectedModalEnv}
                  options={ savePresetEnv }
                  onSetValue={ (item) => {
                    setSelectedModalEnv(item)
                    dialog.showOpenDialog( BrowserWindow.getFocusedWindow(), getDialogSettByEnvType(item.value))
                    .then(({ filePaths, canceled }) => {
                      setEnvMapFile({
                        file: ( canceled || (filePaths.length > 1) ) ? undefined : filePaths[0],
                        files: ( canceled ) ? [] : filePaths,
                        canceled
                      },item.value)
                    })
                    .catch(err => console.error(err))
                    .finally(() => {
                      // automatically blur to return keyboard control
                      document.activeElement.blur()
                    }) 
                  }}/>
            </div>
          </div>
          <div className="inspector-row">
            <FileInput
              onChange={setEnvMapFile}
              label={getEnvironmentLabel({
                      lableName:"shot-generator.inspector.inspected-world.map",
                      helpButtonVisu:'hidden'  
                    })}
              value={backgroundMapValue}
              platform={platform}
              dialogSettings = { getDialogSettByEnvType }
              onClickUsed = {false} 
            />
          </div>
          <NumberSlider
            label={t("shot-generator.inspector.common.rotate-x")}
            value={_Math.radToDeg(world.environmentMap.rotation.x)}
            min={-180}
            max={180}
            step={1}
            onSetValue={setEnvMapRotateX}
            transform={transforms.degrees}
            formatter={formatters.degrees}
          />

          <NumberSlider
            label={t("shot-generator.inspector.common.rotate-y")}
            value={_Math.radToDeg(world.environmentMap.rotation.z)}
            min={-180}
            max={180}
            step={1}
            onSetValue={setEnvMapRotateY}
            transform={transforms.degrees}
            formatter={formatters.degrees}
          />

          <NumberSlider
            label={t("shot-generator.inspector.common.rotate-z")}
            value={_Math.radToDeg(world.environmentMap.rotation.y)}
            min={-180}
            max={180}
            step={1}
            onSetValue={setEnvMapRotateZ}
            transform={transforms.degrees}
            formatter={formatters.degrees}
          />
        </div>

        <h5 className="inspector-label">{t("shot-generator.inspector.inspected-world.environmentModel")}</h5>

        <div className="inspector-group">
          <div className="inspector-row">
            <Checkbox label={t("shot-generator.inspector.common.visible")} checked={world.environment.visible} onClick={setEnvVisible}/>
          </div>
          <div className="inspector-row">
            <Checkbox label={t("shot-generator.inspector.inspected-world.grayscale")}  checked={world.environment.grayscale} onClick={setGrayscale}/>
          </div>
          <div className="inspector-column inspector-offset-row">
            <FileInput
              onChange={setEnvModelFile}
              label={getEnvironmentLabel({
                      lableName:"shot-generator.inspector.inspected-world.file"
                    })}
              value={world.environment.file && path.basename(world.environment.file)}
            />
            <NumberSlider label="X" value={world.environment.x} min={-30} max={30} onSetValue={setEnvX} textFormatter={ textFormatters.imperialToMetric }/>
            <NumberSlider label="Y" value={world.environment.y} min={-30} max={30} onSetValue={setEnvY} textFormatter={ textFormatters.imperialToMetric }/>
            <NumberSlider label="Z" value={world.environment.z} min={-30} max={30} onSetValue={setEnvZ} textFormatter={ textFormatters.imperialToMetric }/>
            <NumberSlider label={t("shot-generator.inspector.common.scale")} value={world.environment.scale} min={0.001} max={2} onSetValue={setEnvScale} textFormatter={ textFormatters.imperialToMetric } textConstraint={ textConstraints.sizeConstraint }/>
            <NumberSlider
                label={t("shot-generator.inspector.common.rotation")}
                value={_Math.degToRad(world.environment.rotation)}
                min={-180}
                max={180}
                step={1}
                onSetValue={setEnvRotation}
                formatter={formatters.degrees}
                transform={transforms.degrees}
            />
          </div>
        </div>

        <h5 className="inspector-label">{t("shot-generator.inspector.inspected-world.ambient-light")}</h5>

        <div className="inspector-group">
          <div className="inspector-column inspector-offset-row">
            <NumberSlider label={t("shot-generator.inspector.common.intensity")} value={world.ambient.intensity} min={0} max={1} onSetValue={setAmbientIntensity}/>
          </div>
        </div>

        <h5 className="inspector-label">{t("shot-generator.inspector.inspected-world.directional-light")}</h5>

        <div className="inspector-group">
          <div className="inspector-column inspector-offset-row">
            <NumberSlider label={t("shot-generator.inspector.common.intensity")} value={world.directional.intensity} min={0} max={1} onSetValue={setDirectionalIntensity}/>
            <NumberSlider
                label={t("shot-generator.inspector.common.rotation")}
                value={_Math.radToDeg(world.directional.rotation)}
                min={-180}
                max={180}
                step={1}
                onSetValue={setDirectionalRotation}
                formatter={formatters.degrees}
                transform={transforms.degrees}
            />
            <NumberSlider
                label={t("shot-generator.inspector.common.tilt")}
                value={_Math.radToDeg(world.directional.tilt)}
                min={-180}
                max={180}
                step={1}
                onSetValue={setDirectionalTilt}
                formatter={formatters.degrees}
                transform={transforms.degrees}
            />
          </div>
        </div>

        <h5 className="inspector-label">{t("shot-generator.inspector.inspected-world.fog")}</h5>

        <div className="inspector-group">
          <div className="inspector-row">
            <Checkbox label={t("shot-generator.inspector.common.visible")} checked={world.fog.visible} onClick={setFogVisible}/>
          </div>
          
          <div className="inspector-column inspector-offset-row">
            <NumberSlider label={t("shot-generator.inspector.common.distance")} value={world.fog.far} min={10} max={500} step={1} onSetValue={setFogDistance}/>
          </div>
        </div>
        
      </Scrollable>
  )
})

const getWorldM = deepEqualSelector([getWorld], world => world)
const getPlatformM = deepEqualSelector([getPlatform], platform => platform)

const mapStateToProps = (state) => ({
  world: getWorldM(state),
  platform: getPlatformM(state),
  storyboarderFilePath: state.meta.storyboarderFilePath
})

const mapDispatchToProps = {
  selectObject, deleteObjects, updateObject, updateWorld, updateWorldRoom, updateWorldEnvironment, updateWorldEnvironmentMap, updateWorldFog
}

export default connect(mapStateToProps, mapDispatchToProps)(InspectedWorld)
