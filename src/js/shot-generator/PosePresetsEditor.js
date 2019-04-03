const { remote } = require('electron')
const { useState, useEffect, useLayoutEffect, useRef, useMemo } = React = require('react')
const { connect } = require('react-redux')
const path = require('path')
const fs = require('fs-extra')

const h = require('../utils/h')

const {
  updateObject
} = require('../shared/reducers/shot-generator')

const ModelLoader = require('../services/model-loader')

require('../vendor/three/examples/js/utils/SkeletonUtils')
require('../vendor/OutlineEffect.js')

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


const THREE = require('three')
window.THREE = THREE
class PoseRenderer {
  constructor () {
    this.renderer = new THREE.WebGLRenderer({
      canvas: document.createElement('canvas'),
      antialias: true
    })
    this.renderer.setClearColor( 0x464646, 1 )

    this.scene = new THREE.Scene()

    this.camera = new THREE.PerspectiveCamera(
      // fov
      75,
      // aspect ratio
      68/120,

      // near
      0.01,

      // far
      1000
    )

    let light = new THREE.AmbientLight(0x333333, 1.0)
    this.scene.add(light)

    this.group = new THREE.Group()
    this.scene.add(this.group)

    let directionalLight = new THREE.DirectionalLight(0xFFFFFF, 1.0)
    directionalLight.position.set(0, 1, 3)
    this.scene.add(directionalLight)

    this.camera.position.y = 1
    this.camera.position.z = 2
    this.scene.add(this.camera)

    this.outlineEffect = new THREE.OutlineEffect(
      this.renderer,
      {
        defaultThickness: 0.018, // 0.008, 0.009
        ignoreMaterial: false,
        defaultColor: [0, 0, 0]
      }
    )
  }

  setup ({ preset }) {
    let pose = preset.state.skeleton
    let skeleton = this.child.skeleton

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

  clear () {}

  render () {
    this.renderer.setSize(68, 120)
    this.outlineEffect.render(this.scene, this.camera)
  }

  toDataURL (...args) {
    return this.renderer.domElement.toDataURL(...args)
  }

  setModelData (modelData) {
    if (!this.group.children.length) {
      let group = THREE.SkeletonUtils.clone(modelData.scene.children[0])
      this.child = group.children[1]

      let material = new THREE.MeshToonMaterial({
        color: 0xffffff,
        emissive: 0x0,
        specular: 0x0,
        skinning: true,
        shininess: 0,
        flatShading: false,
        morphNormals: true,
        morphTargets: true
      })
      // if (this.child.material.map) {
      //   material.map = this.child.material.map
      //   material.map.needsUpdate = true
      // }
      this.child.material = material
      this.group.add(group)

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
      // this.group.add(box)
    }
  }
}

const poseRenderer = new PoseRenderer()

const PosePresetsEditorItem = ({ id, preset, ready, updateObject }) => {
  const [loaded, setLoaded] = useState(false)

  const src = path.join(remote.app.getPath('userData'), 'presets', 'poses', `${preset.id}.jpg`)

  const onClick = event => {
    event.preventDefault()

    let posePresetId = preset.id
    let skeleton = preset.state.skeleton

    console.log('onClick', id, { posePresetId, skeleton }, updateObject)
    updateObject(id, { posePresetId, skeleton })
  }

  useEffect(() => {
    if (!ready) return

    let hasRendered = fs.existsSync(src)

    if (hasRendered) {
      setLoaded(true)
    } else {
      poseRenderer.setup({ preset })
      poseRenderer.render()
      let dataURL = poseRenderer.toDataURL('image/jpg')
      poseRenderer.clear()

      console.log('\n\n\nsaving new image to', src)

      fs.ensureDirSync(path.dirname(src))

      fs.writeFileSync(
        src,
        dataURL.replace(/^data:image\/\w+;base64,/, ''),
        'base64'
      )

      setLoaded(true)
    }
  }, [ready])

  return h(['div.pose-presets-editor__item', { onClick, 'data-id': preset.id }, [
    ['figure', [
      loaded
        ? ['img', { src }]
        : ['div', { style: { fontSize: 12 } }, 'Loading …']
    ]],
    ['div.pose-presets-editor__name', preset.name]
  ]])
}

const PosePresetsEditor = connect(
  state => ({
    posePresets: state.presets.poses,
    attachments: state.attachments
  }),
  {
    updateObject,
    withState: (fn) => (dispatch, getState) => fn(dispatch, getState())
  }
)(
({
  sceneObject,

  posePresets,
  attachments,

  updateObject,
  withState
}) => {
  const [ready, setReady] = useState(false)
  const [terms, setTerms] = useState(null)

  const filepath = useMemo(() =>
    ModelLoader.getFilepathForModel(
      { model: 'adult-male', type: 'character' },
      { storyboarderFilePath: null }
    )
  , [])

  useEffect(() => {
    if (attachments[filepath] && attachments[filepath].value) {
      poseRenderer.setModelData(attachments[filepath].value)
      setReady(true)
    }
  }, [attachments])

  const matchAll = terms == null || terms.length === 0

  const presets = Object.values(posePresets)
    .sort(comparePresetNames)
    .filter(preset => matchAll ? true : preset.name.match(terms))

  const listing = presets.map(preset =>
    [
      PosePresetsEditorItem,
      {
        id: sceneObject.id,
        preset,
        ready,
        updateObject
      }
    ]
  )

  const onChange = event => {
    event.preventDefault()
    setTerms(event.target.value)
  }

  // preload the adult-male
  // useEffect(() => {
  //   if (!attachments[filepath]) {
  //     dispatch({ type: 'ATTACHMENTS_PENDING', payload: { id: filepath } })
  // 
  //     gltfLoader.load(
  //       filepath,
  //       value => {
  //         console.log('cache: success', filepath)
  //         dispatch({ type: 'ATTACHMENTS_SUCCESS', payload: { id: filepath, value } })
  //       },
  //       null,
  //       error => {
  //         console.error('cache: error')
  //         console.error(error)
  //         alert(error)
  //         // dispatch({ type: 'ATTACHMENTS_ERROR', payload: { id: filepath, error } })
  //         dispatch({ type: 'ATTACHMENTS_DELETE', payload: { id: filepath } })
  // 
  //       }
  //     )
  //     return dispatch({ type: 'ATTACHMENTS_LOAD', payload: { id: filepath } })
  //   }
  // }, [])

  const onCreatePosePresetClick = event => {
    event.preventDefault()
  }

  return h(
    ['div.pose-presets-editor.column', [
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
            onClick: onCreatePosePresetClick
          }, '+']
        ]]
      ]],
      ['div.pose-presets-editor__list', [
        listing
      ]]
    ]]
  )
})

module.exports = PosePresetsEditor
// const presetsStorage = require('../shared/store/presetsStorage')
// 
// const savePosePresets = state => presetsStorage.savePosePresets({ poses: state.presets.poses })

// const PosePresetsEditor = connect(
//   state => ({
//     posePresets: state.presets.poses
//   }),
//   {
//     updateObject,
// 
//     selectPosePreset: (id, posePresetId, preset, updateObject) => dispatch => {
//       dispatch(updateObject(id, {
//         // set posePresetId
//         posePresetId,
//         // apply preset values to skeleton data
//         skeleton: preset.state.skeleton
//       }))
//     },
//     createPosePreset: ({ id, name, sceneObject }) => (dispatch, getState) => {
//       // add the skeleton data to a named preset
//       let preset = {
//         id,
//         name,
//         state: {
//           skeleton: sceneObject.skeleton || {}
//         }
//       }
//       //console.log('sceneObject.skeleton: ', sceneObject)
//       // create it
//       dispatch(createPosePreset(preset))
// 
//       // save the presets file
//       savePosePresets(getState())
// 
//       // save to server
//       // for pose harvesting (maybe abstract this later?)
//       request.post('https://storyboarders.com/api/create_pose', {form:{
//         name: name,
//         json: JSON.stringify(sceneObject.skeleton),
//         model_type: sceneObject.model,
//         storyboarder_version: pkg.version,
//         machine_id: machineIdSync()
//     }})
// 
// 
//       // select the preset in the list
//       dispatch(updateObject(sceneObject.id, { posePresetId: id }))
//     },
//     // updatePosePreset,
//     // deletePosePreset
//   }
// )(
//   // TODO could optimize by only passing sceneObject properties we actually care about
//   React.memo(({ sceneObject, posePresets, selectPosePreset, createPosePreset, updateObject }) => {
//     const onCreatePosePresetClick = () => {
//       // show a prompt to get the desired preset name
//       let id = THREE.Math.generateUUID()
//       prompt({
//         title: 'Preset Name',
//         label: 'Select a Preset Name',
//         value: `Pose ${shortId(id)}`
//       }, require('electron').remote.getCurrentWindow()).then(name => {
//         if (name != null && name != '' && name != ' ') {
//           createPosePreset({
//             id,
//             name,
//             sceneObject
//           })
//         }
//       }).catch(err => {
//         console.error(err)
//       })
//     }
// 
//     const onSelectPosePreset = event => {
//       let posePresetId = event.target.value
//       let preset = posePresets[posePresetId]
//       console.log('selecting pose: ', sceneObject.id, posePresetId, preset)
//       selectPosePreset(sceneObject.id, posePresetId, preset, updateObject)
//     }
// 
//     const comparePresetNames = (a, b) => {
//       var nameA = a.name.toUpperCase()
//       var nameB = b.name.toUpperCase()
// 
//       if (nameA < nameB) {
//         return -1
//       }
//       if (nameA > nameB) {
//         return 1
//       }
//       return 0
//     }
// 
//     const sortedPosePresets = Object.values(posePresets).sort(comparePresetNames)
// 
//     return h(
//       ['div.row', { style: { margin: '9px 0 6px 0', paddingRight: 0 } }, [
//         ['div', { style: { width: 50, display: 'flex', alignSelf: 'center' } }, 'pose'],
//         [
//           'select', {
//             required: true,
//             value: sceneObject.posePresetId || '',
//             onChange: preventDefault(onSelectPosePreset),
//             style: {
//               flex: 1,
//               marginBottom: 0,
//               maxWidth: 192
//             }
//           }, [
//               ['option', { value: '', disabled: true }, '---'],
//               sortedPosePresets.map(preset =>
//                 ['option', { value: preset.id }, preset.name]
//               )
//             ]
//           ]
//         ],
//         ['a.button_add[href=#]', { style: { marginLeft: 6 }, onClick: preventDefault(onCreatePosePresetClick) }, '+']
//       ]
//     )
//   }))

module.exports = PosePresetsEditor
