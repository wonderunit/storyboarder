const { remote } = require('electron')
const { useState, useEffect, useMemo, forwardRef, useRef } = React = require('react')
const { connect } = require('react-redux')
const path = require('path')
const fs = require('fs-extra')
const classNames = require('classnames')
const prompt = require('electron-prompt')
const LiquidMetal = require('liquidmetal')
const THREE = require('three')
window.THREE = THREE

// for pose harvesting (maybe abstract this later?)
const { machineIdSync } = require('node-machine-id')
const pkg = require('../../../package.json')
const request = require('request')

const { FixedSizeGrid } = require('react-window')

const h = require('../utils/h')

const {
  updateObject,
  createHandPosePreset,

  getSceneObjects
} = require('../shared/reducers/shot-generator')

const ModelLoader = require('../services/model-loader')

require('../vendor/three/examples/js/utils/SkeletonUtils')

const {createdMirroredHand, applyChangesToSkeleton, getOppositeHandName} = require("../utils/handSkeletonUtils")

const defaultPosePresets = require('../shared/reducers/shot-generator-presets/hand-poses.json')
const presetsStorage = require('../shared/store/presetsStorage')

const comparePresetNames = (a, b) => {
  var nameA = a.name.toUpperCase()
  var nameB = b.name.toUpperCase()

  if (nameA < nameB) {
    return -1
  }
  if (nameA > nameB) {
    return 1
  }
  return 0
}

const comparePresetPriority = (a, b) => b.priority - a.priority

const searchPresetsForTerms = (presets, terms) => {
  const matchAll = terms == null || terms.length === 0

  return presets
    .sort(comparePresetNames)
    .filter(preset => {
      if (matchAll) return true

      return (
        (LiquidMetal.score(preset.name, terms) > 0.8) ||
        (preset.keywords && LiquidMetal.score(preset.keywords, terms) > 0.8)
      )
    })
    .sort(comparePresetPriority)
}

const shortId = id => id.toString().substr(0, 7).toLowerCase()

const GUTTER_SIZE = 5
const ITEM_WIDTH = 68
const ITEM_HEIGHT = 132

const IMAGE_WIDTH = ITEM_WIDTH
const IMAGE_HEIGHT = 100

const ThumbnailRenderer = require('./ThumbnailRenderer')
const filepathFor = model => 
ModelLoader.getFilepathForModel(
  { model: model.id, type: model.type },
  { storyboarderFilePath: null })
  
const CHARACTER_MODEL = { id: 'adult-male', type: 'character' }

const setupRenderer = ({ thumbnailRenderer, attachments, preset, selectedHand }) => {
  if (!thumbnailRenderer.getGroup().children.length) {
    let modelData = attachments[filepathFor(CHARACTER_MODEL)].value

    let group = THREE.SkeletonUtils.clone(modelData.scene.children[0])
    let child = group.children[1]

    let material = new THREE.MeshToonMaterial({
      color: 0xffffff,
      emissive: 0x0,
      specular: 0x0,
      skinning: true,
      shininess: 0,
      flatShading: false,
      morphNormals: true,
      morphTargets: true,
      map: modelData.scene.children[0].children[1].material.map
    })
    material.map.needsUpdate = true

    child.material = material
    thumbnailRenderer.getGroup().add(group)
    group.rotation.y = Math.PI/20

  }

  // setup thumbnail renderer
  let mesh = thumbnailRenderer.getGroup().children[0].children[1]
  let pose = preset.state.handSkeleton
  let skeleton = mesh.skeleton
  skeleton.pose()
  for (let name in pose) {
    let bone = skeleton.getBoneByName(name)
    if (bone) {
      bone.rotation.x = pose[name].rotation.x
      bone.rotation.y = pose[name].rotation.y
      bone.rotation.z = pose[name].rotation.z
      bone.updateMatrixWorld(true)
    }
  }
  let euler = new THREE.Euler(0, 200 * THREE.Math.DEG2RAD, 0)
  let bone = skeleton.getBoneByName(selectedHand)
  bone.updateMatrixWorld(true)
  bone.parent.parent.parent.quaternion.setFromEuler(euler)
  bone.parent.parent.quaternion.set(0, 0, 0, 1)
  bone.parent.quaternion.set(0, 0, 0, 1)
  bone.quaternion.set(0, 0, 0, 1)

  bone.parent.parent.parent.updateWorldMatrix(true, true)
}

const HandPresetsEditorItem = React.memo(({ style, id, handPosePresetId, preset, updateObject, attachments, thumbnailRenderer, withState, selectedHand }) => {
  const src = path.join(remote.app.getPath('userData'), 'presets', 'handPoses', `${preset.id}.jpg`)
  const onPointerDown = event => {
    event.preventDefault()
    let currentSkeleton = null
    withState((dispatch, state) => {
      currentSkeleton = getSceneObjects(state)[id].handSkeleton
    })
    if(!currentSkeleton) currentSkeleton = {}
    let handPosePresetId = preset.id
    let handSkeleton = preset.state.handSkeleton
    let skeletonBones = Object.keys(handSkeleton)      
    let currentSkeletonBones = Object.keys(currentSkeleton)      
    if(skeletonBones.length !== 0) {
      let presetHand = skeletonBones[0].includes("RightHand") ? "RightHand" : "LeftHand"
      let oppositeSkeleton = createdMirroredHand(handSkeleton, presetHand)
      if (selectedHand === "BothHands") {
        handSkeleton = Object.assign(oppositeSkeleton, handSkeleton)
      } 
      else if (selectedHand !== presetHand) {
        if(currentSkeletonBones.some(bone => bone.includes(presetHand))) {
          handSkeleton = applyChangesToSkeleton(currentSkeleton, oppositeSkeleton)
        }
        else {
            handSkeleton = oppositeSkeleton
        }
      }
      else {
        if(currentSkeletonBones.some(bone => bone.includes(getOppositeHandName(presetHand)))) {
          handSkeleton = applyChangesToSkeleton(currentSkeleton, handSkeleton)
        }
      }
    }
    updateObject(id, { handPosePresetId, handSkeleton })
  }


  useMemo(() => {
    let hasRendered = fs.existsSync(src)

    if (!hasRendered) {
      thumbnailRenderer.current = thumbnailRenderer.current || new ThumbnailRenderer()
      selectedHand = Object.keys(preset.state.handSkeleton)[0].includes("RightHand") ? "RightHand" : "LeftHand"
      setupRenderer({
        thumbnailRenderer: thumbnailRenderer.current,
        attachments,
        preset,
        selectedHand
      })
      let bone = thumbnailRenderer.current.getGroup().children[0].children[1].skeleton.getBoneByName(selectedHand)
      let camera = thumbnailRenderer.current.camera

      let boxGeometry = new THREE.BoxGeometry(2.5, 2)
      let material = new THREE.MeshBasicMaterial()
      let mesh = new THREE.Mesh(boxGeometry, material);
      bone.parent.add(mesh)
      mesh.scale.multiplyScalar(0.1 / thumbnailRenderer.current.getGroup().children[0].children[1].scale.x)
      mesh.position.copy(bone.position)
      mesh.position.y += 0.00095
      mesh.updateWorldMatrix(true, true)
      clampInstance(mesh, camera)

      mesh.visible = false;
      thumbnailRenderer.current.render()
      let dataURL = thumbnailRenderer.current.toDataURL('image/jpg')
      thumbnailRenderer.current.clear()

      fs.ensureDirSync(path.dirname(src))

      fs.writeFileSync(
        src,
        dataURL.replace(/^data:image\/\w+;base64,/, ''),
        'base64'
      )
    }
  }, [src])

  let className = classNames({
    'thumbnail-search__item--selected': handPosePresetId === preset.id
  })

  return h(['div.thumbnail-search__item', {
    style,
    className,
    onPointerDown,
    'data-id': preset.id,
    title: preset.name
  }, [
    ['figure', { style: { width: IMAGE_WIDTH, height: IMAGE_HEIGHT }}, [
      ['img', { src, style: { width: IMAGE_WIDTH, height: IMAGE_HEIGHT } }]
    ]],
    ['div.thumbnail-search__name', {
      style: {
        width: ITEM_WIDTH,
        height: ITEM_HEIGHT - IMAGE_HEIGHT - GUTTER_SIZE
      },
    }, preset.name]
  ]])
})

const clampInstance = (instance, camera ) => {
    let box = new THREE.Box3().setFromObject(instance);
		let sphere = new THREE.Sphere();
		box.getBoundingSphere(sphere);
		let direction = new THREE.Vector3();
    camera.getWorldDirection(direction) 
		let s = new THREE.Vector3(0, 0, -1)
		let h = sphere.radius / Math.tan( camera.fov / 2 * Math.PI / 180 );
		let newPos = new THREE.Vector3().addVectors( sphere.center, s.setLength(h) );
		camera.position.copy(newPos);
    camera.lookAt(sphere.center);
    camera.updateMatrixWorld(true)
}

const ListItem = React.memo(({ data, columnIndex, rowIndex, style }) => {
  let { id, handPosePresetId, updateObject, attachments, thumbnailRenderer, withState, selectedHand } = data
  let preset = data.presets[columnIndex + (rowIndex * 4)]

  if (!preset) return h(['div', { style }])

  return h([
    HandPresetsEditorItem,
    {
      style,
      id, handPosePresetId, attachments, updateObject,
      preset,

      thumbnailRenderer,
      withState, 
      selectedHand
    }
  ])
})

const HandPresetsEditor = connect(
  state => ({
    attachments: state.attachments,

    handPosePresets: state.presets.handPoses,
  }),
  {
    updateObject,
    createHandPosePreset,
    withState: (fn) => (dispatch, getState) => fn(dispatch, getState())
  }
)(
React.memo(({
  id,
  handPosePresetId,

  handPosePresets,
  attachments,

  updateObject,
  createHandPosePreset,
  withState,
  scene
}) => {
  const thumbnailRenderer = useRef()

  const [ready, setReady] = useState(false)
  const [terms, setTerms] = useState(null)
  //currentScene = scene
  // !!!!!Should be intialized somewhere else
 // handPosePresets = []
  const presets = useMemo(() => searchPresetsForTerms(Object.values(handPosePresets), terms), [handPosePresets, terms])
  const [selectedHand, setSelectedHand] = useState("BothHands")
  useEffect(() => {
    if (ready) return

    let filepath = filepathFor(CHARACTER_MODEL)
    if (attachments[filepath] && attachments[filepath].value) {
      setTimeout(() => {
        setReady(true)
      }, 100) // slight delay for snappier character selection via click
    }
  }, [attachments])

  const onChangeHand = event => {
    setSelectedHand(event.target.value)
  }

  const onChange = event => {
    event.preventDefault()
    setTerms(event.currentTarget.value)
  }

  const onCreateHandPosePreset = event => {
    event.preventDefault()

    // show a prompt to get the desired preset name
    let win = remote.getCurrentWindow()
    prompt({
      title: 'Preset Name',
      label: 'Select a Preset Name',
      value: `HandPose ${shortId(THREE.Math.generateUUID())}`,
    }, win).then(name => { if( name ) 
      prompt({   
        title: 'Hand chooser',
        lable: 'Select which hand to save',   
        type: 'select',
        selectOptions: { 
            'LeftHand': 'Left Hand',
            'RightHand': 'Right Hand',
        }}, win).then((handName) => { if(handName) {
            if (name != null && name != '' && name != ' ') {
              withState((dispatch, state) => {
                // get the latest skeleton data
                let sceneObject = getSceneObjects(state)[id]
                let skeleton = sceneObject.skeleton
                let model = sceneObject.model
                let originalSkeleton = scene.children.filter(child => child.userData.id === id)[0].getObjectByProperty("type", "SkinnedMesh").skeleton.bones
                let handSkeleton = {}
                setSelectedHand(handName)
                for(let i = 0; i < originalSkeleton.length; i++) {
                    let key = originalSkeleton[i].name
                    if(key.includes(handName) && key !== handName) {
                      let rot = originalSkeleton[i].rotation
                      handSkeleton[key] = { rotation: { x: rot.x, y: rot.y, z: rot.z } }
                    }
                }
                // create a preset out of it
                let newPreset = {
                  id: THREE.Math.generateUUID(),
                  name,
                  keywords: name, // TODO keyword editing
                  state: {
                    handSkeleton: handSkeleton || {}
                  },
                  priority: 0
                }
                // add it to state
                createHandPosePreset(newPreset)
            
                // save to server
                // for pose harvesting (maybe abstract this later?)
                request.post('https://storyboarders.com/api/create_pose', {
                  form: {
                    name: name,
                    json: JSON.stringify(skeleton),
                    model_type: model,
                    storyboarder_version: pkg.version,
                    machine_id: machineIdSync()
                  }
                })
            
                // select the preset in the list
                updateObject(id, { handPosePresetId: newPreset.id })
            
                // get updated state (with newly created pose preset)
                withState((dispatch, state) => {
                  // ... and save it to the presets file
                  let denylist = Object.keys(defaultPosePresets)
                  let filteredPoses = Object.values(state.presets.handPoses)
                    .filter(pose => denylist.includes(pose.id) === false)
                    .reduce(
                      (coll, pose) => {
                        coll[pose.id] = pose
                        return coll
                      },
                      {}
                    )
                  presetsStorage.saveHandPosePresets({ handPoses: filteredPoses })
                })
              })
            }}}
    ).catch(err =>
      console.error(err)
    )})
  }

  // via https://reactjs.org/docs/forwarding-refs.html
  const innerElementType = forwardRef(({ style, ...rest }, ref) => {
    return h([
      'div',
      {
        ref,
        style: {
          ...style,
          width: 288, // cut off the right side gutter
          position: 'relative',
          overflow: 'hidden'
        },
        ...rest
      },
    ])
  })

  return h(
    ['div.thumbnail-search.column', ready && [
      ['div.row', { style: { padding: '6px 0' } }, [
        ['div.column', { style: { flex: 1 }}, [
          ['input', {
            placeholder: 'Search for a pose …',
            onChange
          }],
        ]],
        ['div.column', { style: { marginLeft: 5 }}, [
          ['a.button_add[href=#]', {
            style: { width: 30, height: 34 },
            onPointerDown: onCreateHandPosePreset
          }, '+']
        ]]
      ]],
      ['div.row', { style: { padding: '6px 0' } }, [
        ['div', { style: { width: 50, display: 'flex', alignSelf: 'center' } }, 'Select hand'],
        ['div.column', { style: { flex: 1 }}, [

          ['select', {
            onChange: onChangeHand,
            value: selectedHand,
          }, 
          ['option', {value: "LeftHand"}, 'Left Hand'],
          ['option', {value: "RightHand"}, 'Right Hand'],
          ['option', {value: "BothHands"}, 'Both Hands']],
        ]]
      ]],
      ['div.thumbnail-search__list', [
        FixedSizeGrid,
        {
          columnCount: 4,
          columnWidth: ITEM_WIDTH + GUTTER_SIZE,

          rowCount: Math.ceil(presets.length / 4),
          rowHeight: ITEM_HEIGHT,

          width: 288,
          height: 363,

          innerElementType,

          itemData: {
            presets,

            id: id,
            handPosePresetId: handPosePresetId,

            attachments,
            updateObject,

            thumbnailRenderer,
            withState,
            selectedHand
          },
          children: ListItem
        }
      ]]
    ]]
  )
}))

module.exports = HandPresetsEditor
