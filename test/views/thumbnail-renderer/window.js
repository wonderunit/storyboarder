__REACT_DEVTOOLS_GLOBAL_HOOK__ = { isDisabled: true }

const THREE = require('three')
window.THREE = window.THREE || THREE

const path = require('path')
const fs = require('fs-extra')
const { useMemo } = React = require('react')
const ReactDOM = require('react-dom')
const { Provider, connect } = require('react-redux')
const { createStore } = require('redux')

const h = require('../../../src/js/utils/h')

const { reducer, initialState } = require('../../../src/js/shared/reducers/shot-generator')
const store = createStore(reducer, initialState)

const { useAttachmentLoader, getFilepathForLoadable } = require('../../../src/js/express-xr/src/hooks/useAttachmentLoader')

const ModelLoader = require('../../../src/js/services/model-loader')

const ThumbnailRenderer = require('../../../src/js/shot-generator/ThumbnailRenderer')
const thumbnailRenderer = new ThumbnailRenderer()

const pathToShotGeneratorData = path.join(
  __dirname, '..', '..', '..', 'src', 'data', 'shot-generator')

require('three-rounded-box')(THREE)
const roundedBoxFactory = () => {
  const boxRadius = .005
  const boxRadiusSegments = 5
  let geometry = new RoundedBoxGeometry( 1, 1, 1, boxRadius, boxRadiusSegments )
  return new THREE.Mesh( geometry )
}

const filepathFor = model => 
  ModelLoader.getFilepathForModel(
    { model: model.id, type: model.type },
    { storyboarderFilePath: null })

// see: PosePresetsEditorItem
const Render = ({ model, modelData }) => {
  const src = path.join(pathToShotGeneratorData, 'objects', `${model.id}.jpg`)

  const groupFactory = () => {
    let group = new THREE.Group()

    if (model.id === 'box') {
      let mesh = roundedBoxFactory()
      mesh.material = materialFactory()
      group.add(mesh)
    } else {
      modelData.scene.traverse(child => {
        if ( child instanceof THREE.Mesh ) {
          group.add(meshFactory(child.clone()))
        }
      })
    }

    return group
  }

  // via SceneObject
  const materialFactory = () => new THREE.MeshToonMaterial({
    color: 0xcccccc,
    emissive: 0x0,
    specular: 0x0,
    shininess: 0,
    flatShading: false
  })
  const meshFactory = originalMesh => {
    let mesh = originalMesh.clone()

    let material = materialFactory()

    if (mesh.material.map) {
      material.map = mesh.material.map
      material.map.needsUpdate = true
    }
    mesh.material = material

    return mesh
  }

  const setupCamera = (model, group, camera) => {
    // let box = new THREE.Box3().expandByObject(group)
    // console.log(model.id, box.min, box.max)

    switch (model.id) {
      case 'box':
        camera.position.y -= 1
        camera.position.x += 0.05
        group.rotation.y = (Math.PI/180)*22
        group.rotation.x = (Math.PI/180)*22
        break

      case 'bed-full':
      case 'bed-king':
      case 'bed-twin':
      case 'table-counter':
        camera.position.z += 1.2
        camera.position.y -= 0.2
        group.rotation.y = (Math.PI/180)*90
        if (model.id === 'bed-twin') {
          group.position.y -= 0.15
        }
        break

      case 'chair-sofa-wide':
        camera.position.z += 6
        camera.position.y -= 0.2
        group.rotation.y += (Math.PI/180)*45
        group.position.x = 2
        group.position.y = -1.5
        break

      case 'table-sit-rectangle':
        camera.position.z += 3
        break

      case 'vehicle-car':
        group.position.z = -3
        group.position.x = -0.8
        group.rotation.y += Math.PI / 6
        break;

      default:
        group.rotation.y = Math.PI/20
        break
    }
  }

  useMemo(() => {
    let hasRendered = false // fs.existsSync(src)

    if (!hasRendered) {
      // setup thumbnail renderer
      let renderGroup = groupFactory()
      thumbnailRenderer.getGroup().add(renderGroup)
      let camera = thumbnailRenderer.getCamera()
      let originalCamera = camera.clone()
      setupCamera(model, renderGroup, camera)

      // render
      thumbnailRenderer.render()
      let dataURL = thumbnailRenderer.toDataURL('image/jpg')

      // clean
      thumbnailRenderer.getGroup().remove(renderGroup)
      thumbnailRenderer.camera = originalCamera
      thumbnailRenderer.clear()

      fs.ensureDirSync(path.dirname(src))

      fs.writeFileSync(
        src,
        dataURL.replace(/^data:image\/\w+;base64,/, ''),
        'base64'
      )
    }
  }, [src])

  return h([
    'img', { src, width: 230, title: model.id, style: { margin: 4 } }
  ])
}

const TestView = connect(
  state => ({
    models: state.models
  }),
  {}
)(
({
  models
}) => {
  const [attachments, attachmentsDispatch] = useAttachmentLoader()

  const loadables = Object.values(models)
    .filter(o => o.type === 'object')

  useMemo(() => {
    loadables
    .filter(o => o.id !== 'box')
    .forEach(model =>
      attachmentsDispatch({
        type: 'PENDING',
        payload: { id: filepathFor(model) }
      })
    )
  }, [models])

  const started = Object.values(attachments).length > 0
  const remaining = useMemo(
    () => Object.values(attachments).filter(a => a.status !== 'Success').length,
    [attachments])

  if (!started || remaining) {
    return h(['div', 'Loading ...'])
  } else {
    return h(['div', [
      loadables.map(model => {
        let filepath = filepathFor(model)
        let modelData = attachments[filepath] && attachments[filepath].value
        return [Render, {
          model,
          modelData
        }]
      })
    ]])
  }
})

let div = document.createElement('div')
document.body.appendChild(div)
ReactDOM.render(
  h([
    Provider, { store }, [
      'div.container', { style: { margin: 50 }}, [
        TestView
      ]
    ]
  ]),
  div
)
