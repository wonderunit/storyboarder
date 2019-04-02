const { remote } = require('electron')
const { useState, useEffect, useLayoutEffect, useRef, useMemo } = React = require('react')
const { connect } = require('react-redux')
const path = require('path')
const fs = require('fs-extra')

const h = require('../utils/h')

const {
  updateObject
} = require('../shared/reducers/shot-generator')

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

    let geometry = new THREE.BoxGeometry( 1, 1, 1 )
    let material = new THREE.MeshToonMaterial({
      color: 0xcccccc,
      emissive: 0x0,
      specular: 0x0,
      shininess: 0,
      flatShading: false
    })
    this.child = new THREE.Mesh( geometry, material )
    this.scene.add(this.child)

    let light = new THREE.AmbientLight(0x333333, 1.0)
    this.scene.add(light)

    let directionalLight = new THREE.DirectionalLight(0xFFFFFF, 1.0)
    directionalLight.position.set(0, 1, 3)
    this.scene.add(directionalLight)

    this.camera.position.z = 3
    this.scene.add(this.camera)

    console.log(this.scene)
  }

  setup ({ preset }) {
    console.log('setting up', preset.state.skeleton)
    this.child.rotation.set(
      Math.random(),
      Math.random(),
      Math.random()
    )
  }

  clear () {
    console.log('shutting down')
  }

  render () {
    this.renderer.setSize(68, 120)
    this.renderer.render(this.scene, this.camera)
  }

  toDataURL (...args) {
    return this.renderer.domElement.toDataURL(...args)
  }
}

const poseRenderer = new PoseRenderer()

const PosePresetsEditorItem = ({ preset }) => {
  const [loaded, setLoaded] = useState(false)

  const src = path.join(remote.app.getPath('userData'), 'presets', 'poses', `${preset.id}.jpg`)

  const onClick = event => {
    event.preventDefault()
    console.log(event.target.dataset.id)
  }

  useEffect(() => {
    if (fs.existsSync(src)) {
      setLoaded(true)
    } else {
      poseRenderer.setup({ preset })
      poseRenderer.render()
      let dataURL = poseRenderer.toDataURL('image/jpg')
      poseRenderer.clear()

      console.log('saving new image to', src)

      fs.ensureDirSync(path.dirname(src))

      fs.writeFileSync(
        src,
        dataURL.replace(/^data:image\/\w+;base64,/, ''),
        'base64'
      )

      setLoaded(true)
    }
  }, [])

  return h(['div.pose-presets-editor__item', [
    ['figure', [
      loaded
        ? ['img', { src }]
        : ['div', { style: { fontSize: 12 } }, 'Loading …']
    ]],
    ['a[href=#]', { onClick, 'data-id': preset.id },
      preset.name
    ]
  ]])
}

const PosePresetsEditor = connect(
  state => ({
    posePresets: state.presets.poses
  }),
  {
    updateObject
  }
)(
({
  sceneObject,

  posePresets,
  updateObject
}) => {
  const [terms, setTerms] = useState(null)

  const matchAll = terms == null || terms.length === 0

  const presets = Object.values(posePresets)
    .sort(comparePresetNames)
    .filter(preset => matchAll ? true : preset.name.match(terms))

  const listing = presets.map(preset => [PosePresetsEditorItem, { preset }])

  const onChange = event => {
    event.preventDefault()
    setTerms(event.target.value)
  }

  return h(
    ['div.pose-presets-editor.column', [
      ['div.row', [
        ['input', {
          placeholder: 'Search for a pose …',
          onChange
        }]
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
