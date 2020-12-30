import React, {useCallback, useMemo} from 'react'
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
  updateWorldFog,
  getWorld,
  
  selectObject, deleteObjects, updateObject, updateWorld
} from './../../../shared/reducers/shot-generator'

import deepEqualSelector from './../../../utils/deepEqualSelector'
import CopyFile from '../../utils/CopyFile'
import { useTranslation } from 'react-i18next'
const InspectedWorld = React.memo(({updateObject, updateWorld, updateWorldRoom, updateWorldEnvironment, updateWorldFog, world, storyboarderFilePath}) => {
  const { t } = useTranslation()
  const setGround = useCallback(() => updateWorld({ground: !world.ground}), [world.ground])
  const setRoomVisible = useCallback(() => updateWorldRoom({visible: !world.room.visible}), [world.room.visible])
  const setEnvVisible = useCallback(() => updateWorldEnvironment({visible: !world.environment.visible}), [world.environment.visible])
  const setFogVisible = useCallback(() => updateWorldFog({visible: !world.fog.visible}), [world.fog.visible])

  const setFogDistance = useCallback((far) => updateWorldFog({far}), [])
  
  const setRoomWidth = useCallback((width) => updateWorldRoom({width}), [])
  const setRoomHeight = useCallback((height) => updateWorldRoom({height}), [])
  const setRoomLength = useCallback((length) => updateWorldRoom({length}), [])
  
  const setEnvX = useCallback((x) => updateWorldEnvironment({x}), [])
  const setEnvY = useCallback((y) => updateWorldEnvironment({y}), [])
  const setEnvZ = useCallback((z) => updateWorldEnvironment({z}), [])
  
  const setEnvScale = useCallback((scale) => updateWorldEnvironment({scale}), [])
  const setEnvRotation = useCallback((rotation) => updateWorldEnvironment({rotation: _Math.radToDeg(rotation)}), [])
  const setEnvFile = useCallback((event) => {
    if (event.file) {
      updateWorldEnvironment({file: CopyFile(storyboarderFilePath, event.file, 'environment')})
    }
  }, [])
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

        <h5 className="inspector-label">{t("shot-generator.inspector.inspected-world.environment")}</h5>

        <div className="inspector-group">
          <div className="inspector-row">
            <Checkbox label={t("shot-generator.inspector.common.visible")} checked={world.environment.visible} onClick={setEnvVisible}/>
          </div>
          <div className="inspector-row">
            <Checkbox label={t("shot-generator.inspector.inspected-world.grayscale")}  checked={world.environment.grayscale} onClick={setGrayscale}/>
          </div>
          <div className="inspector-column inspector-offset-row">
            <FileInput
              onChange={setEnvFile}
              label={EnvironmentModelLabel}
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

const mapStateToProps = (state) => ({
  world: getWorldM(state),
  storyboarderFilePath: state.meta.storyboarderFilePath
})

const mapDispatchToProps = {
  selectObject, deleteObjects, updateObject, updateWorld, updateWorldRoom, updateWorldEnvironment, updateWorldFog
}

export default connect(mapStateToProps, mapDispatchToProps)(InspectedWorld)
