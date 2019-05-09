const { useMemo } = (React = require('react'))
const SGVirtualCamera = require('../components/SGVirtualCamera')
const GUIElement = require('./GUIElement')

import * as SDFText from './sdftext'
const textCreator = SDFText.creator()

const cameraSettings = {
  id: 'gui-camera',
  x: 0,
  y: -0.25,
  z: 0.5,
  fov: 22,
  rotation: 0,
  tilt: 0,
  roll: 0
}

const uiScale = 0.075
const bWidth = 0.0125

const GUI = ({ aspectRatio, guiMode }) => {
  const fovLabel = useMemo(() => {
    return textCreator.create('22mm')
  }, [])

  const otherLabel = useMemo(() => {
    return textCreator.create('Object 1')
  }, [])

  return (
    <group rotation={[(Math.PI / 180) * -45, 0, 0]} userData={{ type: 'gui' }}>
      <primitive object={fovLabel} position={[0.5, 0.5, -0.2]} scale={[2, 2, 2]} />
      <primitive object={otherLabel} position={[-0.75, 0.5, -0.2]} scale={[2, 2, 2]} />

      <group position={[(uiScale * 1.5 * 0.5 + uiScale * 0.5 + (uiScale * 0.5 + uiScale * 0.5) + bWidth * 2) * -1, 0, 0]}>
        <GUIElement
          {...{
            name: 'properties_ui',
            width: uiScale * 1.5,
            height: uiScale * 2,
            radius: bWidth,
            color: 'black'
          }}
        />
      </group>

      <group position={[(uiScale * 0.5 + uiScale * 0.5 + bWidth) * -1, 0, 0]}>
        <GUIElement
          {...{
            name: 'tools_ui',
            width: uiScale,
            height: uiScale,
            radius: bWidth,
            color: 'black'
          }}
        />
      </group>

      <group position={[(uiScale * 0.5 + uiScale * 0.5 + bWidth) * -1, 0, 0.001]} scale={[0.9, 0.9, 0.9]}>
        <group position={[uiScale * 0.25, uiScale * 0.25, 0]} scale={[0.8, 0.8, 0.8]}>
          <GUIElement
            {...{
              name: 'selection_mode',
              width: uiScale * 0.5,
              height: uiScale * 0.5,
              radius: bWidth,
              color: guiMode === 'selection' ? 0x6e6e6e : 0x212121
            }}
          />
        </group>

        <group position={[uiScale * -0.25, uiScale * 0.25, 0]} scale={[0.8, 0.8, 0.8]}>
          <GUIElement
            {...{
              name: 'duplicate_mode',
              width: uiScale * 0.5,
              height: uiScale * 0.5,
              radius: bWidth,
              color: guiMode === 'duplicate' ? 0x6e6e6e : 0x212121
            }}
          />
        </group>

        <group position={[uiScale * 0.25, uiScale * -0.25, 0]} scale={[0.8, 0.8, 0.8]}>
          <GUIElement
            {...{
              name: 'add_mode',
              width: uiScale * 0.5,
              height: uiScale * 0.5,
              radius: bWidth,
              color: guiMode === 'add' ? 0x6e6e6e : 0x212121
            }}
          />
        </group>

        <group position={[uiScale * -0.25, uiScale * -0.25, 0]} scale={[0.8, 0.8, 0.8]}>
          <GUIElement
            {...{
              name: 'erase_mode',
              width: uiScale * 0.5,
              height: uiScale * 0.5,
              radius: bWidth,
              color: guiMode === 'erase' ? 0x6e6e6e : 0x212121
            }}
          />
        </group>
      </group>

      <group position={[uiScale * 1.5 * 0.5 + uiScale * 0.5 + bWidth, 0, 0]}>
        <GUIElement
          {...{
            name: 'undo_ui',
            width: uiScale * 1.5,
            height: uiScale * 0.5,
            radius: bWidth,
            color: 'black'
          }}
        />
      </group>

      <SGVirtualCamera {...{ aspectRatio, ...cameraSettings }} />
    </group>
  )
}

module.exports = GUI
