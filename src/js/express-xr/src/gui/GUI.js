const { useMemo } = (React = require('react'))
const {  useThree } = require('../lib/react-three-fiber')

const SGVirtualCamera = require('../components/SGVirtualCamera')
const GUIElement = require('./GUIElement')

import * as SDFText from './sdftext'
const textCreator = SDFText.creator()

const uiScale = 0.075
const bWidth = 0.0125
const camSettings = {
  size: 0.07 + bWidth,
  id: 'gui-camera',
  fov: 22
}

const findParent = obj => {
  while (obj) {
    if (!obj.parent || obj.parent.type === 'Scene') {
      return obj
    }
    obj = obj.parent
  }

  return null
}

const GUI = ({ aspectRatio, guiMode, currentBoard, selectedObject }) => {
  const { scene } = useThree()

  const fovLabel = useMemo(() => {
    return textCreator.create(`${camSettings.fov}mm`)
  }, [])

  const propTexts = useMemo(() => {
    const object = scene.getObjectById(selectedObject)
    if (!object) return []

    const parent = findParent(object)
    
    let children = []
    const id_text = textCreator.create(parent.userData.displayName)
    children.push(<primitive key={parent.userData.id} object={id_text} />)

    let idx = 1
    for (const [key, value] of Object.entries(parent.userData.forPanel || {})) {
      const prop_text = textCreator.create(key.charAt(0).toUpperCase() + key.slice(1))
      const value_text = textCreator.create(parseInt(value).toString())
      
      prop_text.position.y = -idx * 0.1
      value_text.position.y = -idx * 0.1
      value_text.position.x = 0.1

      children.push(<primitive key={`${idx}_prop`} object={prop_text} />)
      children.push(<primitive key={`${idx}_value`} object={value_text} />)

      idx++
    }

    return children
  }, [selectedObject])

  const selection_texture = useMemo(() => new THREE.TextureLoader().load('/data/system/xr/selection.png'), [])
  const duplicate_texture = useMemo(() => new THREE.TextureLoader().load('/data/system/xr/duplicate.png'), [])
  const add_texture = useMemo(() => new THREE.TextureLoader().load('/data/system/xr/add.png'), [])
  const erase_texture = useMemo(() => new THREE.TextureLoader().load('/data/system/xr/erase.png'), [])
  const arrow_texture = useMemo(() => new THREE.TextureLoader().load('/data/system/xr/arrow.png'), [])

  const camera_texture = useMemo(() => new THREE.TextureLoader().load('/data/system/xr/camera.png'), [])
  const eye_texture = useMemo(() => new THREE.TextureLoader().load('/data/system/xr/eye.png'), [])

  return (
    <group rotation={[(Math.PI / 180) * -45, 0, 0]} userData={{ type: 'gui' }}>
      {selectedObject && (
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
          <group position={[0, 0, 0.001]} scale={[0.35, 0.35, 0.35]}>
            {propTexts}
          </group>
        </group>
      )}

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
        <group position={[uiScale * -0.25, uiScale * 0.25, 0]} scale={[0.8, 0.8, 0.8]}>
          <GUIElement
            {...{
              icon: selection_texture,
              name: 'selection_mode',
              width: uiScale * 0.5,
              height: uiScale * 0.5,
              radius: bWidth,
              color: guiMode === 'selection' ? 0x6e6e6e : 0x212121
            }}
          />
        </group>

        <group position={[uiScale * 0.25, uiScale * 0.25, 0]} scale={[0.8, 0.8, 0.8]}>
          <GUIElement
            {...{
              icon: duplicate_texture,
              name: 'duplicate_mode',
              width: uiScale * 0.5,
              height: uiScale * 0.5,
              radius: bWidth,
              color: guiMode === 'duplicate' ? 0x6e6e6e : 0x212121
            }}
          />
        </group>

        <group position={[uiScale * -0.25, uiScale * -0.25, 0]} scale={[0.8, 0.8, 0.8]}>
          <GUIElement
            {...{
              icon: add_texture,
              name: 'add_mode',
              width: uiScale * 0.5,
              height: uiScale * 0.5,
              radius: bWidth,
              color: guiMode === 'add' ? 0x6e6e6e : 0x212121
            }}
          />
        </group>

        <group position={[uiScale * 0.25, uiScale * -0.25, 0]} scale={[0.8, 0.8, 0.8]}>
          <GUIElement
            {...{
              icon: erase_texture,
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

      <group position={[uiScale * 1.5 * 0.5 + uiScale * 0.5 + bWidth, 0, 0.001]} scale={[1, 1, 1]}>
        <group position={[uiScale * -0.5, 0, 0]} scale={[-0.8, 0.8, 0.8]}>
          <GUIElement
            {...{
              icon: arrow_texture,
              name: 'prev_board',
              width: uiScale * 0.5,
              height: uiScale * 0.5,
              radius: bWidth,
              color: currentBoard === 'prev' ? 0x6e6e6e : 0x212121
            }}
          />
        </group>

        <group position={[uiScale * 0.5, 0, 0]} scale={[0.8, 0.8, 0.8]}>
          <GUIElement
            {...{
              icon: arrow_texture,
              name: 'next_board',
              width: uiScale * 0.5,
              height: uiScale * 0.5,
              radius: bWidth,
              color: currentBoard === 'next' ? 0x6e6e6e : 0x212121
            }}
          />
        </group>
      </group>

      <group position={[0, 0.25, 0]}>
        <SGVirtualCamera {...{ aspectRatio, ...camSettings }} />

        <group
          position={[camSettings.size * 0.5 * aspectRatio + uiScale * 0.25 + bWidth, uiScale * -0.25 + bWidth * -0.5, 0]}
        >
          <GUIElement
            {...{
              icon: camera_texture,
              name: 'camera_button',
              width: uiScale * 0.5,
              height: uiScale * 0.5,
              radius: bWidth,
              color: 0x212121
            }}
          />
        </group>

        <group
          position={[camSettings.size * 0.5 * aspectRatio + uiScale * 0.75 + bWidth * 2, uiScale * -0.25 + bWidth * -0.5, 0]}
        >
          <GUIElement
            {...{
              icon: eye_texture,
              name: 'eye_button',
              width: uiScale * 0.5,
              height: uiScale * 0.5,
              radius: bWidth,
              color: 0x212121
            }}
          />
        </group>

        <group
          position={[
            camSettings.size * 0.5 * aspectRatio + (uiScale + bWidth) * 0.5 + bWidth,
            uiScale * 0.25 + bWidth * 0.5,
            0
          ]}
        >
          <GUIElement
            {...{
              name: 'fov_slider',
              width: uiScale + bWidth,
              height: uiScale * 0.5,
              radius: bWidth,
              color: 0x212121
            }}
          />
          <primitive object={fovLabel} position={[0, 0, 0.001]} scale={[0.35, 0.35, 0.35]} />
        </group>
      </group>
    </group>
  )
}

module.exports = GUI
