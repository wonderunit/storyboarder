const { useMemo, useState, useRef } = (React = require('react'))
const { useThree, useRender } = require('react-three-fiber')
const { updateObject } = require('../../../shared/reducers/shot-generator')

const SGVirtualCamera = require('../components/SGVirtualCamera')
const GUIElement = require('./GUIElement')

import * as Slider from './dat.gui/slider'
import * as SDFText from './dat.gui/sdftext'
const textCreator = SDFText.creator()

const textPadding = 0.03
const uiScale = 0.075
const bWidth = 0.0125

const findParent = obj => {
  while (obj) {
    if (!obj.parent || obj.parent.type === 'Scene') {
      return obj
    }
    obj = obj.parent
  }

  return null
}

const GUI = ({ aspectRatio, guiMode, addMode, currentBoard, selectedObject, hideArray, virtualCamVisible, guiCamFOV, vrControllers }) => {
  const [textCount, setTextCount] = useState(0)
  const slidersRef = useRef([])
  const fovSliderRef = useRef([])

  const { scene } = useThree()

  const camSettings = {
    size: 0.07 + bWidth,
    id: 'gui-camera',
    fov: guiCamFOV
  }

  // console.log(camSettings)

  // const fovLabel = useMemo(() => {
  //   return textCreator.create(`${camSettings.fov}mm`, { centerText: 'custom' })
  // }, [])

  const updateGeometry = (id, prop, value) => {
    if (id && prop) {
      let object = scene.getObjectById(id)

      if (prop === 'guiFOV') {
        const guiCam = scene.getObjectByName('guiCam')
        guiCam.dispatchEvent({ type: 'updateFOV', fov: value })
        return
      }

      switch (prop) {
        case 'width':
          object.scale.x = value
          break
        case 'height':
          if (object.userData.name === 'character-container') {
            object = object.children[0]
            if (object.userData.modelSettings.height) {
              let originalHeight = object.userData.originalHeight
              let scale = value / originalHeight
              object.scale.set(scale, scale, scale)
            } else {
              object.scale.setScalar(value)
            }
          } else {
            object.scale.y = value
          }
          break
        case 'depth':
          object.scale.z = value
          break
        case 'size':
          object.scale.set(value, value, value)
          break
        case 'fov':
          object.traverse(child => {
            if (child.type === 'PerspectiveCamera') {
              child.dispatchEvent({ type: 'updateFOV', fov: value })
            }
          })
          break
        case 'angle':
        case 'intensity':
          object.traverse(child => {
            if (child.type === 'SpotLight') {
              child[prop] = value
            }
          })
          break
        case 'mesomorphic':
          object.children[0].children[0].morphTargetInfluences[0] = value
          break
        case 'ectomorphic':
          object.children[0].children[0].morphTargetInfluences[1] = value
          break
        case 'endomorphic':
          object.children[0].children[0].morphTargetInfluences[2] = value
          break
        case 'headScale':
          object = object.children[0].children[0]
          let headBone = object.skeleton.getBoneByName('Head')
          if (headBone) {
            headBone.scale.setScalar(value)
          }
          break
        default:
          break
      }
    }
  }

  const updateState = (id, prop, value) => {
    if (id && prop) {
      const event = new CustomEvent('updateRedux', {
        detail: {
          id,
          prop,
          value
        }
      })
      window.dispatchEvent(event)
    }
  }

  const fovSlider = useMemo(() => {
    const slider = Slider.createSlider({
      textCreator,
      prop: 'guiFOV',
      id: 'guiCam',
      object: new THREE.Vector3(),
      initialValue: 22,
      min: 3,
      max: 71,
      width: (uiScale + bWidth) / 0.35,
      height: (uiScale * 0.5) / 0.35,
      corner: bWidth / 0.35,
      fovSlider: true
    })

    slider
      .name('')
      .step(1)
      .onChange(updateGeometry)
      .onFinishedChange(updateState)
    slider.scale.set(0.35, 0.35, 0.35)

    fovSliderRef.current = slider
    return slider
  }, [])

  const sliderObjects = useMemo(() => {
    slidersRef.current.forEach(slider => {
      const obj = slider.props.object
      obj.traverse(child => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose()
          child.material.dispose()
        }
      })
      scene.remove(obj)
    })

    const object = scene.getObjectById(selectedObject)
    if (!object) return []

    const parent = findParent(object)
    if (!parent.userData.forPanel) {
      setTextCount(0)
      return []
    }

    setTextCount(Object.values(parent.userData.forPanel).length)

    let children = []
    const id_text = textCreator.create(parent.userData.displayName, { color: 0xffffff, scale: 0.475, centerText: false })
    children.push(<primitive key={parent.userData.id} object={id_text} />)

    let idx = 1
    for (const [key, value] of Object.entries(parent.userData.forPanel || {})) {
      const decimal = Math.round((value + 0.00001) * 100) / 100

      let minMax = { min: 0, max: 1 }
      let prop = key
      let title = key

      switch (key) {
        case 'fov':
          minMax = { min: 3, max: 71 }
          break
        case 'intensity':
          minMax = { min: 0.03, max: 1 }
          break
        case 'angle':
          minMax = { min: 0.03, max: 1.57 }
          break
        case 'headScale':
          minMax = { min: 0.8, max: 1.2 }
          break
        case 'height':
          if (parent.userData.type === "character") minMax = { min: 1.4732, max: 2.1336 }
          break
        case 'mesomorphic':
        case 'ectomorphic':
        case 'endomorphic':
          minMax = { min: 0, max: 1 }
          break
        case 'width':
        case 'height':
        case 'depth':
        case 'size':
          minMax = { min: 0.03, max: 5 }
          break
      }

      if (key === 'fov') title = 'F.O.V'
      if (key === 'headScale') title = 'head'
      if (key === 'mesomorphic') title = 'meso'
      if (key === 'ectomorphic') title = 'ecto'
      if (key === 'endomorphic') title = 'obese'

      const slider = Slider.createSlider({
        textCreator,
        prop,
        object: new THREE.Vector3(),
        id: parent.id,
        uuid: parent.userData.id,
        initialValue: decimal,
        min: minMax.min,
        max: minMax.max,
        width: (uiScale * 1.5) / 0.35,
        height: (uiScale * 0.5) / 0.35,
        corner: bWidth
      })

      const name = title.charAt(0).toUpperCase() + title.slice(1)
      slider
        .name(name)
        .step(0.1)
        .onChange(updateGeometry)
        .onFinishedChange(updateState)
      slider.scale.set(0.35, 0.35, 0.35)

      slider.position.y = -idx * (uiScale * 0.5 + bWidth)
      children.push(<primitive key={`${parent.userData.displayName}_${key}_slider`} object={slider} />)

      idx++
    }

    slidersRef.current = children
    return children
  }, [selectedObject])

  const updateSliders = () => {
    slidersRef.current.forEach(child => {
      if (!child.key.includes('slider')) return
      const slider = child.props.object
      slider.updateControl(vrControllers)
    })

    if (fovSliderRef.current) {
      fovSliderRef.current.updateControl(vrControllers)
    }
  }

  useRender(updateSliders, false, [vrControllers])

  const selection_texture = useMemo(() => new THREE.TextureLoader().load('/data/system/xr/selection.png'), [])
  const duplicate_texture = useMemo(() => new THREE.TextureLoader().load('/data/system/xr/duplicate.png'), [])
  const add_texture = useMemo(() => new THREE.TextureLoader().load('/data/system/xr/add.png'), [])
  const erase_texture = useMemo(() => new THREE.TextureLoader().load('/data/system/xr/erase.png'), [])
  const arrow_texture = useMemo(() => new THREE.TextureLoader().load('/data/system/xr/arrow.png'), [])

  const camera_texture = useMemo(() => new THREE.TextureLoader().load('/data/system/xr/camera.png'), [])
  const eye_texture = useMemo(() => new THREE.TextureLoader().load('/data/system/xr/eye.png'), [])

  const camera_toolbar_texture = useMemo(() => new THREE.TextureLoader().load('/data/system/xr/icon-toolbar-camera.png'), [])
  const object_texture = useMemo(() => new THREE.TextureLoader().load('/data/system/xr/icon-toolbar-object.png'), [])
  const character_texture = useMemo(() => new THREE.TextureLoader().load('/data/system/xr/icon-toolbar-character.png'), [])
  const light_texture = useMemo(() => new THREE.TextureLoader().load('/data/system/xr/icon-toolbar-light.png'), [])

  return (
    <group rotation={[(Math.PI / 180) * -30, 0, 0]} userData={{ type: 'gui' }} position={[0, 0.015, -0.005]}>
      <group rotation={[(Math.PI / 180) * -70, 0, 0]}>
        <group name="properties_container">
          {selectedObject && textCount && (
            <group
              position={[
                (uiScale * 2.75 * 0.5 + uiScale * 0.5 + (uiScale * 0.5 + uiScale * 0.5) + bWidth * 2) * -1,
                ((textCount + 1) * (uiScale * 0.5 + bWidth) + bWidth) * 0.5 - uiScale * 0.5,
                0
              ]}
            >
              <GUIElement
                {...{
                  name: 'properties_ui',
                  width: uiScale * 2.75,
                  height: (textCount + 1) * (uiScale * 0.5 + bWidth) + bWidth,
                  radius: bWidth,
                  color: 'black'
                }}
              />
              <group
                position={[
                  uiScale * 2.75 * -0.5 + bWidth,
                  ((textCount + 1) * (uiScale * 0.5 + bWidth) + bWidth) * 0.5 - textPadding * 0.475 - bWidth,
                  0.001
                ]}
              >
                {sliderObjects}
              </group>
            </group>
          )}
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

        {guiMode === 'add' && (
          <group>
            <group position={[(uiScale * 0.5 + uiScale * 0.5 + bWidth) * -2, 0, 0]}>
              <GUIElement
                {...{
                  name: 'add_ui',
                  width: uiScale,
                  height: uiScale,
                  radius: bWidth,
                  color: 'black'
                }}
              />
            </group>

            <group position={[(uiScale * 0.5 + uiScale * 0.5 + bWidth) * -2, 0, 0.001]} scale={[0.9, 0.9, 0.9]}>
              <group position={[uiScale * -0.25, uiScale * 0.25, 0]} scale={[0.8, 0.8, 0.8]}>
                <GUIElement
                  {...{
                    icon: camera_toolbar_texture,
                    name: 'camera_add',
                    width: uiScale * 0.5,
                    height: uiScale * 0.5,
                    radius: bWidth,
                    color: addMode === 'camera' ? 0x6e6e6e : 0x212121
                  }}
                />
              </group>

              <group position={[uiScale * 0.25, uiScale * 0.25, 0]} scale={[0.8, 0.8, 0.8]}>
                <GUIElement
                  {...{
                    icon: object_texture,
                    name: 'object_add',
                    width: uiScale * 0.5,
                    height: uiScale * 0.5,
                    radius: bWidth,
                    color: addMode === 'object' ? 0x6e6e6e : 0x212121
                  }}
                />
              </group>

              <group position={[uiScale * -0.25, uiScale * -0.25, 0]} scale={[0.8, 0.8, 0.8]}>
                <GUIElement
                  {...{
                    icon: character_texture,
                    name: 'character_add',
                    width: uiScale * 0.5,
                    height: uiScale * 0.5,
                    radius: bWidth,
                    color: addMode === 'character' ? 0x6e6e6e : 0x212121
                  }}
                />
              </group>

              <group position={[uiScale * 0.25, uiScale * -0.25, 0]} scale={[0.8, 0.8, 0.8]}>
                <GUIElement
                  {...{
                    icon: light_texture,
                    name: 'light_add',
                    width: uiScale * 0.5,
                    height: uiScale * 0.5,
                    radius: bWidth,
                    color: addMode === 'light' ? 0x6e6e6e : 0x212121
                  }}
                />
              </group>
            </group>
          </group>
        )}

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
        <SGVirtualCamera
          {...{
            aspectRatio,
            selectedObject,
            hideArray,
            virtualCamVisible,
            guiCamera: true,
            camOffset: new THREE.Vector3(0, -0.05, 0.075),
            ...camSettings
          }}
        />

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

        <group name="fov_slider" position={[camSettings.size * 0.5 * aspectRatio + bWidth, uiScale * 0.25 + bWidth * 0.5, 0]}>
          <primitive object={fovSlider} scale={[0.35, 0.35, 0.35]} />
        </group>
      </group>
    </group>
  )
}

module.exports = GUI
