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
  createPosePreset,
  createObjects,
  getSceneObjects
} = require('../shared/reducers/shot-generator')

const ModelLoader = require('../services/model-loader')

require('../vendor/three/examples/js/utils/SkeletonUtils')

const defaultPosePresets = require('../shared/reducers/shot-generator-presets/poses.json')
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

const setupRenderer = ({ thumbnailRenderer, attachments, preset }) => {
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

    // uncomment to test a simple box
    //
    // let box = new THREE.Mesh(
    //   new THREE.BoxGeometry( 1, 1, 1 ),
    //   new THREE.MeshToonMaterial({
    //     color: 0xcccccc,
    //     emissive: 0x0,
    //     specular: 0x0,
    //     shininess: 0,
    //     flatShading: false
    //   })
    // )
    // thumbnailRenderer.getGroup().add(box)
  }

  // setup thumbnail renderer
  let mesh = thumbnailRenderer.getGroup().children[0].children[1]
  let pose = preset.state.skeleton
  let skeleton = mesh.skeleton
  skeleton.pose()
  for (let name in pose) {
    let bone = skeleton.getBoneByName(name)
    if (bone) {
      bone.rotation.x = pose[name].rotation.x
      bone.rotation.y = pose[name].rotation.y
      bone.rotation.z = pose[name].rotation.z

      if (name === 'Hips') {
        bone.rotation.x += Math.PI / 2.0
      }
    }
  }
}

const PosePresetsEditorItem = React.memo(({ style, id, posePresetId, preset, updateObject, attachments, thumbnailRenderer, createObjects, withState }) => {
  const src = path.join(remote.app.getPath('userData'), 'presets', 'poses', `${preset.id}.jpg`)

  const onPointerDown = event => {
    event.preventDefault()

    let posePresetId = preset.id
    let skeleton = preset.state.skeleton
  
    withState((dispatch, state) => {
      let sceneObject = getSceneObjects(state)[id]
      let currentParent = new THREE.Group()
      currentParent.position.set(sceneObject.x, sceneObject.z, sceneObject.y)
      currentParent.rotation.set(0, sceneObject.rotation, 0 )
      currentParent.updateMatrixWorld(true)
      let prevParent = new THREE.Group()
      let attachableObject = new THREE.Object3D()
      updateObject(id, { posePresetId, skeleton })
      let attachables = preset.state.attachables
      let newAttachables = []
      if(attachables) {
        for(let i = 0; i < attachables.length; i++) {
          let attachable = attachables[i]
          prevParent.position.set(preset.state.position.x, preset.state.position.z, preset.state.position.y)
          prevParent.rotation.set(0, preset.state.rotation, 0 )
          prevParent.updateMatrixWorld(true)
          let newAttachable = {}
          newAttachable.attachToId = id
          newAttachable.id = THREE.Math.generateUUID()
          newAttachable.loaded = false
          newAttachable.model = attachable.model
          newAttachable.name = attachable.name
          newAttachable.type = attachable.type
          newAttachable.size = attachable.size
          newAttachable.bindBone = attachable.bindBone

          attachableObject.position.set(attachable.x, attachable.y, attachable.z)
          attachableObject.rotation.set(attachable.rotation.x, attachable.rotation.y, attachable.rotation.z)
          attachableObject.updateMatrixWorld(true)
          prevParent.add(attachableObject)
          attachableObject.applyMatrix(prevParent.getInverseMatrixWorld())
          
          prevParent.position.copy(currentParent.position)
          prevParent.rotation.copy(currentParent.rotation)
          prevParent.updateMatrixWorld(true)
          attachableObject.updateMatrixWorld(true)
          let {x, y, z }  = attachableObject.worldPosition()
          newAttachable.x = x
          newAttachable.y = y
          newAttachable.z = z
          let quaternion = attachableObject.worldQuaternion()
          let euler = new THREE.Euler().setFromQuaternion(quaternion)
          newAttachable.rotation = { x: euler.x, y: euler.y, z: euler.z }
          newAttachables.push(newAttachable)
        }
      }
      createObjects(newAttachables)
    })
  }

  useMemo(() => {
    let hasRendered = fs.existsSync(src)

    if (!hasRendered) {
      thumbnailRenderer.current = thumbnailRenderer.current || new ThumbnailRenderer()
      setupRenderer({
        thumbnailRenderer: thumbnailRenderer.current,
        attachments,
        preset
      })
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
    'thumbnail-search__item--selected': posePresetId === preset.id
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

const ListItem = React.memo(({ data, columnIndex, rowIndex, style }) => {
  let { id, posePresetId, updateObject, attachments, thumbnailRenderer, createObjects, withState } = data
  let preset = data.presets[columnIndex + (rowIndex * 4)]

  if (!preset) return h(['div', { style }])

  return h([
    PosePresetsEditorItem,
    {
      style,
      id, posePresetId, attachments, updateObject,
      preset,
      
      thumbnailRenderer,
      createObjects,
      withState
    }
  ])
})

const PosePresetsEditor = connect(
  state => ({
    attachments: state.attachments,

    posePresets: state.presets.poses,
  }),
  {
    updateObject,
    createPosePreset,
    createObjects,
    withState: (fn) => (dispatch, getState) => fn(dispatch, getState())
  }
)(
React.memo(({
  id,
  posePresetId,

  posePresets,
  attachments,

  updateObject,
  createPosePreset,
  createObjects,
  scene,
  withState
}) => {
  const thumbnailRenderer = useRef()  

  const [ready, setReady] = useState(false)
  const [terms, setTerms] = useState(null)

  const presets = useMemo(() => searchPresetsForTerms(Object.values(posePresets), terms), [posePresets, terms])

  useEffect(() => {
    if (ready) return

    let filepath = filepathFor(CHARACTER_MODEL)
    if (attachments[filepath] && attachments[filepath].value) {
      setTimeout(() => {
        setReady(true)
      }, 100) // slight delay for snappier character selection via click
    }
  }, [attachments])


  const onChange = event => {
    event.preventDefault()
    setTerms(event.currentTarget.value)
  }

  const onCreatePosePreset = event => {
    event.preventDefault()

    // show a prompt to get the desired preset name
    let win = remote.getCurrentWindow()
    prompt({
      title: 'Preset Name',
      label: 'Select a Preset Name',
      value: `Pose ${shortId(THREE.Math.generateUUID())}`
    }, win).then(name => {
      if (name != null && name != '' && name != ' ') {
        withState((dispatch, state) => {
          // get the latest skeleton data
          let sceneObject = getSceneObjects(state)[id]
          let skeleton = sceneObject.skeleton
          let model = sceneObject.model
          let character = scene.children.filter(child => child.userData.id === sceneObject.id)[0]
          let attachables = []
          if(character.attachables) {
            for(let i = 0; i < character.attachables.length; i++) {
              let attachableSceneObject = getSceneObjects(state)[character.attachables[i].userData.id]
              attachables.push(attachableSceneObject)
            }

          }

          // create a preset out of it
          let newPreset = {
            id: THREE.Math.generateUUID(),
            name,
            keywords: name, // TODO keyword editing
            state: {
              position: {x:sceneObject.x, y: sceneObject.y, z: sceneObject.z},
              rotation: sceneObject.rotation,
              skeleton: skeleton || {},
              attachables: attachables
            },
            priority: 0,

          }

          // add it to state
          createPosePreset(newPreset)

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
          updateObject(id, { posePresetId: newPreset.id })

          // get updated state (with newly created pose preset)
          withState((dispatch, state) => {
            // ... and save it to the presets file
            let denylist = Object.keys(defaultPosePresets)
            let filteredPoses = Object.values(state.presets.poses)
              .filter(pose => denylist.includes(pose.id) === false)
              .reduce(
                (coll, pose) => {
                  coll[pose.id] = pose
                  return coll
                },
                {}
              )
            presetsStorage.savePosePresets({ poses: filteredPoses })
          })
        })
      }
    }).catch(err =>
      console.error(err)
    )
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
            onPointerDown: onCreatePosePreset
          }, '+']
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
            posePresetId: posePresetId,

            attachments,
            updateObject,

            thumbnailRenderer,
            createObjects,
            withState
          },
          children: ListItem
        }
      ]]
    ]]
  )
}))

module.exports = PosePresetsEditor
