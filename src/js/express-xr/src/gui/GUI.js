const { useMemo, useState, useRef } = (React = require('react'))
const { useThree, useRender } = require('react-three-fiber')
const { updateObject } = require('../../../shared/reducers/shot-generator')
const { findParent } = require('../utils/xrHelperFuncs')

const SGVirtualCamera = require('../components/SGVirtualCamera')
const GUIElement = require('./GUIElement')

import * as Slider from './dat.gui/slider'
import * as SDFText from './dat.gui/sdftext'
const textCreator = SDFText.creator()

const textPadding = 0.03
const uiScale = 0.075
const bWidth = 0.0125

const GUI = ({
  rStatsRef,
  worldScaleGroupRef,
  aspectRatio,
  models,
  presets,
  guiMode,
  addMode,
  currentBoard,
  selectedObject,
  hideArray,
  virtualCamVisible,
  flipHand,
  selectorOffset, 
  guiSelector,
  helpToggle,
  helpSlide,
  guiCamFOV,
  vrControllers
}) => {
  const previousTime = useRef([null])
  const [fps, setFPS] = useState(0)

  const [textCount, setTextCount] = useState(0)
  const slidersRef = useRef([])
  const fovSliderRef = useRef([])

  const { scene } = useThree()

  const camSettings = {
    size: 0.07 + bWidth,
    id: 'gui-camera',
    fov: guiCamFOV
  }

  const poses = Object.values(presets.poses)
  const poseVisibleAmount = poses.slice(selectorOffset * 4, selectorOffset * 4 + 16)

  const characters = Object.values(models).filter(model => model.type === 'character')
  const characterVisibleAmount = characters.slice(selectorOffset * 4, selectorOffset * 4 + 16)

  const objects = Object.values(models).filter(model => model.type === 'object')
  const objectVisibleAmount = objects.slice(selectorOffset * 4, selectorOffset * 4 + 16)
  // console.log(camSettings)

  // const fovLabel = useMemo(() => {
  //   return textCreator.create(`${camSettings.fov}mm`, { centerText: 'custom' })
  // }, [])

  // first look for matching id under world group, if not found look under vrControllers
  let object = worldScaleGroupRef.current
    ? worldScaleGroupRef.current.children.find(child => child.userData.id === selectedObject)
    : undefined
  if (object === undefined) {
    vrControllers.forEach(controller => {
      const match = controller.children.find(child => child.userData.id === selectedObject)
      if (match) object = match
    })
    if (object === undefined) object = false
  }

  const updateGeometry = (id, prop, value) => {
    if (id && prop) {
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
            const character = object.children[0]
            if (character.userData.modelSettings.height) {
              let originalHeight = character.userData.originalHeight
              let scale = value / originalHeight
              character.scale.set(scale, scale, scale)
            } else {
              character.scale.setScalar(value)
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
        case 'ectomorphic':
        case 'endomorphic':
          const array = ['mesomorphic', 'ectomorphic', 'endomorphic']
          let character = object.children[0].children[0]
          if (character.type === 'LOD') {
            character.children.forEach(lod => {
              lod.morphTargetInfluences[array.indexOf(prop)] = value
            })
          } else {
            character.morphTargetInfluences[array.indexOf(prop)] = value
          }
          break
        case 'headScale':
          character = object.children[0].children[0]

          if (character.type === 'LOD') {
            character.children.forEach(lod => {
              let headBone = lod.skeleton.getBoneByName('Head')
              if (headBone) {
                headBone.scale.setScalar(value)
              }
            })
          } else {
            let headBone = character.skeleton.getBoneByName('Head')
            if (headBone) {
              headBone.scale.setScalar(value)
            }
          }

          break
        default:
          break
      }
    }
  }

  const updateState = (id, prop, value) => {
    if (id && prop) {
      const event = new CustomEvent('updateGUIProp', {
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
          if (parent.userData.type === 'character') minMax = { min: 1.4732, max: 2.1336 }
          else minMax = { min: 0.03, max: 5 }
          break
        case 'mesomorphic':
        case 'ectomorphic':
        case 'endomorphic':
          minMax = { min: 0, max: 1 }
          break
        case 'width':
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

  useRender(() => {
    if (rStatsRef.current) {
      // Update XR FPS Counter every 1 second
      if (!previousTime.current) previousTime.current = 0

      const currentTime = Date.now()
      const delta = currentTime - previousTime.current

      if (delta > 1000) {
        previousTime.current = currentTime
        setFPS(parseInt(rStatsRef.current('FPS').value()))
      }
    }
  }, false, [rStatsRef.current])

  const selection_texture = useMemo(() => new THREE.TextureLoader().load('/data/system/xr/selection.png'), [])
  const duplicate_texture = useMemo(() => new THREE.TextureLoader().load('/data/system/xr/duplicate.png'), [])
  const add_texture = useMemo(() => new THREE.TextureLoader().load('/data/system/xr/add.png'), [])
  const erase_texture = useMemo(() => new THREE.TextureLoader().load('/data/system/xr/erase.png'), [])
  const arrow_texture = useMemo(() => new THREE.TextureLoader().load('/data/system/xr/arrow.png'), [])
  const hand_texture = useMemo(() => new THREE.TextureLoader().load('/data/system/xr/hand.png'), [])
  const help_texture = useMemo(() => new THREE.TextureLoader().load('/data/system/xr/help.png'), [])
  const close_texture = useMemo(() => new THREE.TextureLoader().load('/data/system/xr/close.png'), [])

  const camera_texture = useMemo(() => new THREE.TextureLoader().load('/data/system/xr/camera.png'), [])
  const eye_texture = useMemo(() => new THREE.TextureLoader().load('/data/system/xr/eye.png'), [])

  const camera_toolbar_texture = useMemo(() => new THREE.TextureLoader().load('/data/system/xr/icon-toolbar-camera.png'), [])
  const object_texture = useMemo(() => new THREE.TextureLoader().load('/data/system/xr/icon-toolbar-object.png'), [])
  const character_texture = useMemo(() => new THREE.TextureLoader().load('/data/system/xr/icon-toolbar-character.png'), [])
  const light_texture = useMemo(() => new THREE.TextureLoader().load('/data/system/xr/icon-toolbar-light.png'), [])
  
  const poseSelect_texture = useMemo(() => new THREE.TextureLoader().load('/data/system/xr/pose.png'), [])
  const objectSelect_texture = useMemo(() => new THREE.TextureLoader().load('/data/system/xr/object.png'), [])

  const poseTextures = useMemo(() => {
    const textureArray = []
    poses.forEach((pose, id) => {
      const texture = new THREE.TextureLoader().load(`/data/presets/poses/${pose.id}.jpg`)
      textureArray[id] = texture
    })

    return textureArray
  }, [])

  const objectTextures = useMemo(() => {
    const textureArray = []
    objects.forEach((model, id) => {
      const texture = new THREE.TextureLoader().load(`/data/system/objects/${model.id}.jpg`)
      textureArray[id] = texture
    })

    return textureArray
  }, [])

  const characterTextures = useMemo(() => {
    const textureArray = []
    characters.forEach((model, id) => {
      const texture = new THREE.TextureLoader().load(`/data/system/dummies/gltf/${model.id}.jpg`)
      textureArray[id] = texture
    })

    return textureArray
  }, [])

  const help_textures = useMemo(
    () => [1, 2, 3, 4, 5, 6, 7, 8].map(n => new THREE.TextureLoader().load(`/data/system/xr/help_${n}.png`)),
    []
  )

  const invertGUI = flipHand ? -1 : 1
  const fpsMeter = useMemo(() => textCreator.create(fps.toString(), { color: 0xff0000, scale: 0.475, centerText: false }), [fps])
  const selectorScale = 2

  return (
    <group rotation={[(Math.PI / 180) * -30, 0, 0]} userData={{ type: 'gui' }} position={[0, 0.015, -0.005]}>
      <group rotation={[(Math.PI / 180) * -70, 0, 0]}>
        <group name="selector_container">
          {object && object.userData.type === 'character' && guiSelector === 'pose' && (
            <group
              position={[
                ((uiScale * 2 * selectorScale + bWidth) * 0.5 +
                  uiScale * 2.75 * 1 +
                  uiScale * 0.5 +
                  (uiScale * 0.5 + uiScale * 0.5) +
                  bWidth * 3) *
                  -1 *
                  invertGUI,
                (uiScale * 2 * selectorScale + uiScale * 0.5) * 0.5 - uiScale * 0.5,
                0
              ]}
            >
              <primitive
                position={[-uiScale * selectorScale + bWidth, (uiScale * 1.25 - uiScale * 0.325) * selectorScale, 0.001]}
                object={textCreator.create('Poses', { color: 0xffffff, scale: 0.475, centerText: false })}
              />
              <GUIElement
                {...{
                  name: 'selector_ui',
                  width: uiScale * 2 * selectorScale + bWidth,
                  height: uiScale * 2 * selectorScale + uiScale * 0.5,
                  radius: bWidth,
                  color: 'black'
                }}
              />

              <group position={[bWidth * -0.5, -uiScale * 0.25, 0.001]} scale={[0.9, 0.9, 0.9]}>
                <group
                  position={[
                    uiScale * selectorScale + bWidth * 0.75,
                    (-(uiScale * 2) / 8 + uiScale) * selectorScale -
                    ((uiScale * 6) / 4 / (Math.ceil(poses.length / 4) - 4)) * selectorOffset * selectorScale,
                    0
                  ]}
                >
                  <GUIElement
                    {...{
                      name: 'scroll_indicator',
                      width: bWidth * 0.5,
                      height: (uiScale * 2) / 4,
                      radius: bWidth * 0.25,
                      color: 0x6e6e6e
                    }}
                  />
                </group>

                {poseVisibleAmount.map((pose, idx) => {
                  const x = ((idx % 4) * 0.5 - 0.75) * selectorScale
                  const y = (parseInt(idx / 4) * 0.5 - 0.75) * -1 * selectorScale
                  const texture = poseTextures[idx + selectorOffset * 4]

                  if (texture && texture.image) {
                    return (
                      <group key={idx} position={[uiScale * x, uiScale * y, 0]} scale={[0.8, 0.8, 0.8]}>
                        <GUIElement
                          {...{
                            icon: texture,
                            name: `selector-pose_${poses[idx + selectorOffset * 4].id}`,
                            width: uiScale * 0.5 * selectorScale,
                            height: uiScale * 0.5 * selectorScale,
                            radius: bWidth,
                            color: 0x3e4043
                          }}
                        />
                      </group>
                    )
                  }
                })}
              </group>
            </group>
          )}

          {object && object.userData.type === 'character' && guiSelector === 'character' && (
            <group
              position={[
                ((uiScale * 2 * selectorScale + bWidth) * 0.5 +
                  uiScale * 2.75 * 1 +
                  uiScale * 0.5 +
                  (uiScale * 0.5 + uiScale * 0.5) +
                  bWidth * 3) *
                  -1 *
                  invertGUI,
                (uiScale * 2 * selectorScale + uiScale * 0.5) * 0.5 - uiScale * 0.5,
                0
              ]}
            >
              <primitive
                position={[-uiScale * selectorScale + bWidth, (uiScale * 1.25 - uiScale * 0.325) * selectorScale, 0.001]}
                object={textCreator.create('Characters', { color: 0xffffff, scale: 0.475, centerText: false })}
              />
              <GUIElement
                {...{
                  name: 'selector_ui',
                  width: uiScale * 2 * selectorScale + bWidth,
                  height: uiScale * 2 * selectorScale + uiScale * 0.5,
                  radius: bWidth,
                  color: 'black'
                }}
              />

              <group position={[bWidth * -0.5, -uiScale * 0.25, 0.001]} scale={[0.9, 0.9, 0.9]}>
                <group
                  position={[
                    uiScale * selectorScale + bWidth * 0.75,
                    (-(uiScale * 2) / 8 + uiScale) * selectorScale -
                    ((uiScale * 6) / 4 / (Math.ceil(characters.length / 4) - 4)) * selectorOffset * selectorScale,
                    0
                  ]}
                >
                  <GUIElement
                    {...{
                      name: 'scroll_indicator',
                      width: bWidth * 0.5,
                      height: (uiScale * 2) / 4,
                      radius: bWidth * 0.25,
                      color: 0x6e6e6e
                    }}
                  />
                </group>

                {characterVisibleAmount.map((object, idx) => {
                  const x = ((idx % 2) * 1 - 0.5) * selectorScale
                  const y = (parseInt(idx / 2) * 1 - 0.5) * -1 * selectorScale
                  const texture = characterTextures[idx + selectorOffset * 4]

                  if (texture && texture.image) {
                    return (
                      <group key={idx} position={[uiScale * x, uiScale * y, 0]} scale={[0.8, 0.8, 0.8]}>
                        <GUIElement
                          {...{
                            icon: texture,
                            name: `selector-character_${characters[idx + selectorOffset * 4].id}`,
                            width: uiScale * 1 * selectorScale,
                            height: uiScale * 1 * selectorScale,
                            radius: bWidth,
                            color: 0x3e4043
                          }}
                        />
                      </group>
                    )
                  }
                })}
              </group>
            </group>
          )}

          {object && object.userData.type === 'object' && guiSelector === 'object' && (
            <group
              position={[
                ((uiScale * 2 * selectorScale + bWidth) * 0.5 +
                  uiScale * 2.75 * 1 +
                  uiScale * 0.5 +
                  (uiScale * 0.5 + uiScale * 0.5) +
                  bWidth * 3) *
                  -1 *
                  invertGUI,
                (uiScale * 2 * selectorScale + uiScale * 0.5) * 0.5 - uiScale * 0.5,
                0
              ]}
            >
              <primitive
                position={[-uiScale * selectorScale + bWidth, (uiScale * 1.25 - uiScale * 0.325) * selectorScale, 0.001]}
                object={textCreator.create('Objects', { color: 0xffffff, scale: 0.475, centerText: false })}
              />
              <GUIElement
                {...{
                  name: 'selector_ui',
                  width: uiScale * 2 * selectorScale + bWidth,
                  height: uiScale * 2 * selectorScale + uiScale * 0.5,
                  radius: bWidth,
                  color: 'black'
                }}
              />

              <group position={[bWidth * -0.5, -uiScale * 0.25, 0.001]} scale={[0.9, 0.9, 0.9]}>
                <group
                  position={[
                    uiScale * selectorScale + bWidth * 0.75,
                    (-(uiScale * 2) / 8 + uiScale) * selectorScale -
                    ((uiScale * 6) / 4 / (Math.ceil(objects.length / 4) - 4)) * selectorOffset * selectorScale,
                    0
                  ]}
                >
                  <GUIElement
                    {...{
                      name: 'scroll_indicator',
                      width: bWidth * 0.5,
                      height: (uiScale * 2) / 4,
                      radius: bWidth * 0.25,
                      color: 0x6e6e6e
                    }}
                  />
                </group>

                {objectVisibleAmount.map((object, idx) => {
                  const x = ((idx % 4) * 0.5 - 0.75) * selectorScale
                  const y = (parseInt(idx / 4) * 0.5 - 0.75) * -1 * selectorScale
                  const texture = objectTextures[idx + selectorOffset * 4]

                  if (texture && texture.image) {
                    return (
                      <group key={idx} position={[uiScale * x, uiScale * y, 0]} scale={[0.8, 0.8, 0.8]}>
                        <GUIElement
                          {...{
                            icon: texture,
                            name: `selector-object_${objects[idx + selectorOffset * 4].id}`,
                            width: uiScale * 0.5 * selectorScale,
                            height: uiScale * 0.5 * selectorScale,
                            radius: bWidth,
                            color: 0x3e4043
                          }}
                        />
                      </group>
                    )
                  }
                })}
              </group>
            </group>
          )}
        </group>

        <group name="properties_container">
          {object && textCount && (
            <group
              position={[
                (uiScale * 2.75 * 0.5 + uiScale * 0.5 + (uiScale * 0.5 + uiScale * 0.5) + bWidth * 2) * -1 * invertGUI,
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

              {object.userData.type === 'object' && (
                <group
                  position={[
                    uiScale * 2.75 * -0.5 + uiScale * 0.25,
                    ((textCount + 1) * (uiScale * 0.5 + bWidth) + bWidth) * -0.5 - uiScale * 0.25 - bWidth,
                    0.001
                  ]}
                >
                  <GUIElement
                    {...{
                      icon: objectSelect_texture,
                      name: `selector_object_button`,
                      width: uiScale * 0.5,
                      height: uiScale * 0.5,
                      radius: bWidth,
                      color: guiSelector === 'object' ? 0x6e6e6e : 'black'
                    }}
                  />
                </group>
              )}

              {object.userData.type === 'character' && (
                <group>
                  <group
                    position={[
                      uiScale * 2.75 * -0.5 + uiScale * 0.25,
                      ((textCount + 1) * (uiScale * 0.5 + bWidth) + bWidth) * -0.5 - uiScale * 0.25 - bWidth,
                      0.001
                    ]}
                  >
                    <GUIElement
                      {...{
                        icon: poseSelect_texture,
                        name: `selector_pose_button`,
                        width: uiScale * 0.5,
                        height: uiScale * 0.5,
                        radius: bWidth,
                        color: guiSelector === 'pose' ? 0x6e6e6e : 'black'
                      }}
                    />
                  </group>

                  <group
                    position={[
                      uiScale * 2.75 * -0.5 + uiScale * 0.75 + bWidth,
                      ((textCount + 1) * (uiScale * 0.5 + bWidth) + bWidth) * -0.5 - uiScale * 0.25 - bWidth,
                      0.001
                    ]}
                  >
                    <GUIElement
                      {...{
                        icon: poseSelect_texture,
                        name: `selector_character_button`,
                        width: uiScale * 0.5,
                        height: uiScale * 0.5,
                        radius: bWidth,
                        color: guiSelector === 'character' ? 0x6e6e6e : 'black'
                      }}
                    />
                  </group>
                </group>
              )}
            </group>
          )}
        </group>

        <group position={[(uiScale * 0.5 + uiScale * 0.5 + bWidth) * -1 * invertGUI, 0, 0]}>
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

        <group position={[(uiScale * 0.5 + uiScale * 0.5 + bWidth) * -1 * invertGUI, 0, 0.001]} scale={[0.9, 0.9, 0.9]}>
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
            <group position={[(uiScale * 0.5 + uiScale * 0.5 + bWidth) * -2 * invertGUI, 0, 0]}>
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

            <group position={[(uiScale * 0.5 + uiScale * 0.5 + bWidth) * -2 * invertGUI, 0, 0.001]} scale={[0.9, 0.9, 0.9]}>
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

        <group position={[(uiScale * 1.5 * 0.5 + uiScale * 0.5 + bWidth) * invertGUI, 0, 0]}>
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

        <group position={[(uiScale * 1.5 * 0.5 + uiScale * 0.5 + bWidth) * invertGUI, 0, 0.001]} scale={[1, 1, 1]}>
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

        {helpToggle && (
          <group
            position={[
              -0.2,
              (aspectRatio * (0.07 + bWidth) * 2 + uiScale + bWidth * 2) * 0.775 * 0.5 +
                (0.07 + bWidth) * 0.5 +
                bWidth * 2 +
                0.15,
              -0.4
            ]}
            scale={[2, 2, 1]}
          >
            <group
              position={[(aspectRatio * (0.07 + bWidth) * 2 + uiScale + bWidth * 2) * -0.5 - uiScale * 0.5 - bWidth, 0, 0]}
              scale={[-1, 1, 1]}
            >
              <GUIElement
                {...{
                  icon: arrow_texture,
                  name: 'prev_helpButton',
                  width: uiScale,
                  height: uiScale,
                  radius: uiScale * 0.5,
                  color: addMode === 'help_prev' ? 0x6e6e6e : 0x212121
                }}
              />
            </group>

            <group
              position={[(aspectRatio * (0.07 + bWidth) * 2 + uiScale + bWidth * 2) * 0.5 + uiScale * 0.5 + bWidth, 0, 0]}
            >
              <GUIElement
                {...{
                  icon: arrow_texture,
                  name: 'next_helpButton',
                  width: uiScale,
                  height: uiScale,
                  radius: uiScale * 0.5,
                  color: addMode === 'help_next' ? 0x6e6e6e : 0x212121
                }}
              />
            </group>

            <group
              position={[
                (aspectRatio * (0.07 + bWidth) * 2 + uiScale + bWidth * 2) * 0.5 + uiScale * 0.5 + bWidth,
                (aspectRatio * (0.07 + bWidth) * 2 + uiScale + bWidth * 2) * 0.775 * 0.5 + uiScale * 0.5 + bWidth,
                0
              ]}
            >
              <GUIElement
                {...{
                  icon: close_texture,
                  name: 'close_helpButton',
                  width: uiScale,
                  height: uiScale,
                  radius: uiScale * 0.5,
                  color: 0x212121
                }}
              />
            </group>

            <GUIElement
              {...{
                icon: help_textures[helpSlide],
                name: 'help_ui',
                width: aspectRatio * (0.07 + bWidth) * 2 + uiScale + bWidth * 3,
                height: (aspectRatio * (0.07 + bWidth) * 2 + uiScale + bWidth * 3) * 0.775,
                radius: bWidth,
                color: 0xffffff
              }}
            />
          </group>
        )}

        <group
          position={[
            (camSettings.size * 0.5 * aspectRatio + uiScale * 0.25 + bWidth) * invertGUI,
            uiScale * -0.25 + bWidth * -0.5,
            0
          ]}
        >
          <GUIElement
            {...{
              icon: camera_texture,
              name: 'camera_button',
              width: uiScale * 0.5,
              height: uiScale * 0.5,
              radius: bWidth,
              color: addMode === 'gui_camera' ? 0x6e6e6e : 'black'
            }}
          />
        </group>

        <group
          position={[
            (camSettings.size * 0.5 * aspectRatio + uiScale * 0.75 + bWidth * 2) * invertGUI,
            uiScale * -0.25 + bWidth * -0.5,
            0
          ]}
        >
          <GUIElement
            {...{
              icon: eye_texture,
              name: 'eye_button',
              width: uiScale * 0.5,
              height: uiScale * 0.5,
              radius: bWidth,
              color: virtualCamVisible ? 0x6e6e6e : 'black'
            }}
          />
        </group>

        <group
          position={[
            (camSettings.size * 0.5 * aspectRatio + uiScale * 1.25 + bWidth * 3) * invertGUI,
            uiScale * 0.25 + bWidth * 0.5,
            0
          ]}
        >
          <GUIElement
            {...{
              icon: hand_texture,
              name: 'hand_button',
              width: uiScale * 0.5,
              height: uiScale * 0.5,
              radius: bWidth,
              color: flipHand ? 0x6e6e6e : 'black'
            }}
          />
        </group>

        <group
          position={[
            (camSettings.size * 0.5 * aspectRatio + uiScale * 1.25 + bWidth * 3) * invertGUI,
            uiScale * -0.25 + bWidth * -0.5,
            0
          ]}
        >
          <GUIElement
            {...{
              icon: help_texture,
              name: 'help_button',
              width: uiScale * 0.5,
              height: uiScale * 0.5,
              radius: bWidth,
              color: helpToggle ? 0x6e6e6e : 'black'
            }}
          />
        </group>

        <group
          position={[
            (camSettings.size * 0.5 * aspectRatio + uiScale * 1.75 + bWidth * 3) * invertGUI,
            uiScale * -0.25 + bWidth * -0.5,
            0
          ]}
        >
          <primitive object={fpsMeter} />)
        </group>

        <group
          name="fov_slider"
          position={[
            (camSettings.size * 0.5 * aspectRatio + bWidth + (flipHand ? uiScale + bWidth : 0)) * invertGUI,
            uiScale * 0.25 + bWidth * 0.5,
            0
          ]}
        >
          <primitive object={fovSlider} scale={[0.35, 0.35, 0.35]} />
        </group>
      </group>
    </group>
  )
}

module.exports = GUI
