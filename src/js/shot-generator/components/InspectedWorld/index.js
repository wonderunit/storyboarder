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
import SceneTextureType from './SceneTextureType'
const imageFilters = ["jpg", "jpeg", "png", "gif", "dds"]

const InspectedWorld = React.memo(({updateObject, updateWorld, updateWorldRoom, updateWorldEnvironment, updateWorldFog, world, storyboarderFilePath}) => {
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

  const setWorldTexture = useCallback((type, event) => {
    if (event.file) {
      updateWorld({textureType: type, sceneTexture: CopyFile(storyboarderFilePath, event.file, 'sceneTexture')})
    } else {
      updateWorld({textureType:null, sceneTexture: null})
    }
  }, [])

  const setSceneTextureFile = useCallback((event) => {
    setWorldTexture(SceneTextureType.Image, event)
  }, [])

  const setSceneCubeMap = useCallback((event) => {
    setWorldTexture(SceneTextureType.CubeMap, event)
  }, [])
  
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
        <span>File</span>
        {
          <HelpButton
            url="https://github.com/wonderunit/storyboarder/wiki/Creating-custom-3D-Models-for-Shot-Generator"
            title="How to Create 3D Models for Custom Objects"
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
        <h4 className="inspector-label">Scene</h4>
        <div className="inspector-group">
          <div className="inspector-row">
            <Checkbox 
                label="Ground"
                checked={world.ground}
                onClick={setGround}
                style={{opacity: world.room.visible ? 0.5 : 1}}
            />
          </div>

          { !world.sceneTexture && <div className="inspector-row">
            <NumberSlider
                label="Bg color"
                value={world.backgroundColor / 0xFFFFFF}
                min={0}
                max={1}
                onSetValue={setBackground}
            />
          </div> }
          {(!world.textureType || world.textureType === SceneTextureType.CubeMap) && <FileInput
              onChange={setSceneCubeMap}
              label={"Scene Cube map"}
              value={world.sceneTexture && path.basename(world.sceneTexture)}
              filters={ [ { name:"Images", extensions: imageFilters } ] }
              canRemove={ true }
            />
          }
          {(!world.textureType || world.textureType === SceneTextureType.Image) && <FileInput
              onChange={setSceneTextureFile}
              label={"Scene texture"}
              value={world.sceneTexture && path.basename(world.sceneTexture)}
              filters={ [ { name:"Images", extensions: imageFilters } ] }
              canRemove={ true }
            />
            }
        </div>

        <h5 className="inspector-label">Room</h5>

        <div className="inspector-group">
          <div className="inspector-row">
            <Checkbox label="Visible" checked={world.room.visible} onClick={setRoomVisible}/>
          </div>

          <div className="inspector-column inspector-offset-row">
            <NumberSlider label="Width" value={world.room.width} min={1.83} max={76.2} onSetValue={setRoomWidth} textFormatter={ textFormatters.imperialToMetric } textConstraint={ textConstraints.sizeConstraint }/>
            <NumberSlider label="Length" value={world.room.length} min={1.83} max={76.2} onSetValue={setRoomLength} textFormatter={ textFormatters.imperialToMetric } textConstraint={ textConstraints.sizeConstraint }/>
            <NumberSlider label="Height" value={world.room.height} min={1.83} max={12.19} onSetValue={setRoomHeight} textFormatter={ textFormatters.imperialToMetric } textConstraint={ textConstraints.sizeConstraint }/>
          </div>
        </div>

        <h5 className="inspector-label">Environment</h5>

        <div className="inspector-group">
          <div className="inspector-row">
            <Checkbox label="Visible" checked={world.environment.visible} onClick={setEnvVisible}/>
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
            <NumberSlider label="Scale" value={world.environment.scale} min={0.001} max={2} onSetValue={setEnvScale} textFormatter={ textFormatters.imperialToMetric } textConstraint={ textConstraints.sizeConstraint }/>
            <NumberSlider
                label="Rotation"
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

        <h5 className="inspector-label">Ambient light</h5>

        <div className="inspector-group">
          <div className="inspector-column inspector-offset-row">
            <NumberSlider label="Intensity" value={world.ambient.intensity} min={0} max={1} onSetValue={setAmbientIntensity}/>
          </div>
        </div>

        <h5 className="inspector-label">Directional light</h5>

        <div className="inspector-group">
          <div className="inspector-column inspector-offset-row">
            <NumberSlider label="Intensity" value={world.directional.intensity} min={0} max={1} onSetValue={setDirectionalIntensity}/>
            <NumberSlider
                label="Rotation"
                value={_Math.radToDeg(world.directional.rotation)}
                min={-180}
                max={180}
                step={1}
                onSetValue={setDirectionalRotation}
                formatter={formatters.degrees}
                transform={transforms.degrees}
            />
            <NumberSlider
                label="Tilt"
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

        <h5 className="inspector-label">Fog</h5>

        <div className="inspector-group">
          <div className="inspector-row">
            <Checkbox label="Visible" checked={world.fog.visible} onClick={setFogVisible}/>
          </div>
          
          <div className="inspector-column inspector-offset-row">
            <NumberSlider label="Distance" value={world.fog.far} min={10} max={500} step={1} onSetValue={setFogDistance}/>
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
