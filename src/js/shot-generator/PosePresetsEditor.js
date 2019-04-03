const { remote } = require('electron')
const { useState, useEffect, useLayoutEffect, useRef, useMemo } = React = require('react')
const { connect } = require('react-redux')
const path = require('path')
const fs = require('fs-extra')
const classNames = require('classnames')
const prompt = require('electron-prompt')
const THREE = require('three')
window.THREE = THREE

const h = require('../utils/h')

const {
  updateObject,
  createPosePreset
} = require('../shared/reducers/shot-generator')

const ModelLoader = require('../services/model-loader')

require('../vendor/three/examples/js/utils/SkeletonUtils')
require('../vendor/OutlineEffect.js')

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

const shortId = id => id.toString().substr(0, 7).toLowerCase()

const ITEM_WIDTH = 68
const ITEM_HEIGHT = 100

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
      ITEM_WIDTH/ITEM_HEIGHT,

      // near
      0.01,

      // far
      1000
    )

    let light = new THREE.AmbientLight(0xffffff, 0.3)
    this.scene.add(light)

    this.group = new THREE.Group()
    this.scene.add(this.group)

    let directionalLight = new THREE.DirectionalLight(0xFFFFFF, 0.7)

    this.scene.add(directionalLight)
    directionalLight.position.set(0, 5, 3)
    directionalLight.rotation.z = Math.PI/6.0
    directionalLight.rotation.y = Math.PI/6.0
    directionalLight.rotation.x = Math.PI/6.0


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
    this.renderer.setSize(ITEM_WIDTH*2, ITEM_HEIGHT*2)
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
        morphTargets: true,
        map: modelData.scene.children[0].children[1].material.map
      })

      // console.log(modelData.scene.children[0])
      // if (this.child.material.map) {
      //   material.map = this.child.material.map
        material.map.needsUpdate = true
      // }
      this.child.material = material
      this.group.add(group)
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
      // this.group.add(box)
    }
  }
}

const poseRenderer = new PoseRenderer()

const PosePresetsEditorItem = React.memo(({ sceneObject, preset, ready, updateObject }) => {
  const [loaded, setLoaded] = useState(false)

  const src = path.join(remote.app.getPath('userData'), 'presets', 'poses', `${preset.id}.jpg`)

  const onClick = event => {
    event.preventDefault()

    let id = sceneObject.id
    let posePresetId = preset.id
    let skeleton = preset.state.skeleton

    updateObject(id, { posePresetId, skeleton })
  }

  useEffect(() => {
    if (!ready) return

    let hasRendered = fs.existsSync(src)

    //hasRendered = false
    if (hasRendered) {
      setLoaded(true)
    } else {
      poseRenderer.setup({ preset })
      poseRenderer.render()
      let dataURL = poseRenderer.toDataURL('image/jpg')
      poseRenderer.clear()

      fs.ensureDirSync(path.dirname(src))

      fs.writeFileSync(
        src,
        dataURL.replace(/^data:image\/\w+;base64,/, ''),
        'base64'
      )

      setLoaded(true)
    }
  }, [ready])

  let className = classNames({
    'pose-presets-editor__item--selected': sceneObject.posePresetId === preset.id
  })

  return h(['div.pose-presets-editor__item', { className, onClick, 'data-id': preset.id }, [
    ['figure', { style: { height: ITEM_HEIGHT }}, [
      loaded
        ? ['img', { src, style: { width: ITEM_WIDTH, height: ITEM_HEIGHT} }]
        : ['div', { style: { fontSize: 12 } }, '']
    ]],
    ['div.pose-presets-editor__name', preset.name]
  ]])
})

const PosePresetsEditor = connect(
  state => ({
    posePresets: state.presets.poses,
    attachments: state.attachments
  }),
  {
    updateObject,
    createPosePreset,
    withState: (fn) => (dispatch, getState) => fn(dispatch, getState())
  }
)(
({
  sceneObject,

  posePresets,
  attachments,

  updateObject,
  createPosePreset,
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
    .filter(preset => {
      if (matchAll) return true

      let termsRegex = new RegExp(terms, 'i')
      return preset.name.match(termsRegex) ||
              (preset.keywords && preset.keywords.match(termsRegex))
    })

  const listing = presets.map(preset =>
    [
      PosePresetsEditorItem,
      {
        sceneObject,
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

    // show a prompt to get the desired preset name
    let win = remote.getCurrentWindow()
    prompt({
      title: 'Preset Name',
      label: 'Select a Preset Name',
      value: `Pose ${shortId(sceneObject.id)}`
    }, win).then(name => {
      if (name != null && name != '' && name != ' ') {
        let newPreset = {
          id: THREE.Math.generateUUID(),
          name,
          keywords: name, // TODO keyword editing
          state: {
            skeleton: sceneObject.skeleton || {}
          }
        }

        createPosePreset(newPreset)

        // save the presets file
        withState((dispatch, state) => {
          presetsStorage.savePosePresets({ poses: state.presets.poses })
        })

        // save to server
        // for pose harvesting (maybe abstract this later?)
        request.post('https://storyboarders.com/api/create_pose', {
          form: {
            name: name,
            json: JSON.stringify(sceneObject.skeleton),
            model_type: sceneObject.model,
            storyboarder_version: pkg.version,
            machine_id: machineIdSync()
          }
        })

        // select the preset in the list
        updateObject(sceneObject.id, { posePresetId: newPreset.id })

      }
    }).catch(err =>
      console.error(err)
    )
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
