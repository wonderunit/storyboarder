const { useMemo, useState } = (React = require('react'))
const { useThree, useRender } = require('../lib/react-three-fiber')

const SGVirtualCamera = require('../components/SGVirtualCamera')
const GUIElement = require('./GUIElement')

import * as Slider from './dat.gui/slider'
import * as SDFText from './dat.gui/sdftext'
const textCreator = SDFText.creator()

const textPadding = 0.03
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

const GUI = ({ aspectRatio, guiMode, currentBoard, selectedObject, virtualCamVisible, XRControllers }) => {
  const [textCount, setTextCount] = useState(0)
  const { scene } = useThree()

  const fovLabel = useMemo(() => {
    return textCreator.create(`${camSettings.fov}mm`, { centerText: 'custom' })
  }, [])

  const propTexts = useMemo(() => {
    const object = scene.getObjectById(selectedObject)
    if (!object) return []

    const parent = findParent(object)
    setTextCount(Object.values(parent.userData.forPanel).length)

    let children = []
    const id_text = textCreator.create(parent.userData.displayName, { color: 0xffffff, scale: 0.475, centerText: false })
    children.push(<primitive key={parent.userData.id} object={id_text} />)

    let idx = 1
    for (const [key, value] of Object.entries(parent.userData.forPanel || {})) {
      const decimal = Math.round((value + 0.00001) * 100) / 100

      const prop_text = textCreator.create(key.charAt(0).toUpperCase() + key.slice(1), { color: 0xdddddd, scale: 0.35, centerText: false })
      const value_text = textCreator.create(decimal.toString(), { color: 0xdddddd, scale: 0.35, centerText: false })

      prop_text.position.y = -idx * textPadding
      value_text.position.y = -idx * textPadding
      value_text.position.x = 0.06

      children.push(<primitive key={`${key}_prop`} object={prop_text} />)
      children.push(<primitive key={`${key}_value`} object={value_text} />)

      idx++
    }

    return children
  }, [selectedObject])

  const sliderTest = useMemo(() => {
    const object = new THREE.Vector3()

    let children = []
    const test = Slider.createSlider({ textCreator, object })
    test.name('Position X').step(0.1)

    children.push(<primitive key="moi" object={test} />)
    return children
  }, [])

  const controllers = Object.values(XRControllers).slice()
  useRender(() => {
    sliderTest.forEach(child => {
      const slider = child.props.object
      slider.updateControl(controllers)
    })
  })

  const selection_texture = useMemo(() => new THREE.TextureLoader().load('/data/system/xr/selection.png'), [])
  const duplicate_texture = useMemo(() => new THREE.TextureLoader().load('/data/system/xr/duplicate.png'), [])
  const add_texture = useMemo(() => new THREE.TextureLoader().load('/data/system/xr/add.png'), [])
  const erase_texture = useMemo(() => new THREE.TextureLoader().load('/data/system/xr/erase.png'), [])
  const arrow_texture = useMemo(() => new THREE.TextureLoader().load('/data/system/xr/arrow.png'), [])

  const camera_texture = useMemo(() => new THREE.TextureLoader().load('/data/system/xr/camera.png'), [])
  const eye_texture = useMemo(() => new THREE.TextureLoader().load('/data/system/xr/eye.png'), [])

  return (
    <group rotation={[(Math.PI / 180) * -30, 0, 0]} userData={{ type: 'gui' }} position={[0, 0.015, -0.005]}>
      
      <group scale={[0.25, 0.25, 0.25]} position={[-0.325, -0.05, 0]}>{sliderTest}</group>
      
      <group rotation={[(Math.PI / 180) * -70, 0, 0]}>
        {selectedObject && (
          <group
            position={[
              (uiScale * 1.75 * 0.5 + uiScale * 0.5 + (uiScale * 0.5 + uiScale * 0.5) + bWidth * 2) * -1,
              ((textCount + 1) * textPadding + bWidth * 2) * 0.5 - uiScale * 0.5,
              0
            ]}
          >
            <GUIElement
              {...{
                name: 'properties_ui',
                width: uiScale * 1.75,
                height: (textCount + 1) * textPadding + bWidth * 2,
                radius: bWidth,
                color: 'black'
              }}
            />
            <group
              position={[
                uiScale * 1.75 * -0.5 + bWidth,
                ((textCount + 1) * textPadding + bWidth * 2) * 0.5 - textPadding * 0.475 - bWidth,
                0.001
              ]}
            >
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
      </group>

      <group position={[0, 0.05, -0.075]} rotation={[(Math.PI / 180) * -20, 0, 0]}>
        <SGVirtualCamera {...{ aspectRatio, camOffset: new THREE.Vector3(0, -0.05, 0.075), ...camSettings }} />

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
              color: virtualCamVisible ? 0x6e6e6e : 0x212121
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
