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
  const src = filepathFor(model).replace(/.glb$/, '.jpg')

  const groupFactory = () => {
    let group = new THREE.Group()

    if (model.id === 'box') {
      let mesh = roundedBoxFactory()
      mesh.material = materialFactory()
      group.add(mesh)
    } else if (model.type === 'character') {



      // via SGCharacter
      const cloneGltf = gltf => {
        const clone = {
          animations: gltf.animations,
          scene: gltf.scene.clone(true)
        }

        const skinnedMeshes = {}

        gltf.scene.traverse(node => {
          if (node.isSkinnedMesh) {
            skinnedMeshes[node.name] = node
          }
        })

        const cloneBones = {}
        const cloneSkinnedMeshes = {}

        clone.scene.traverse(node => {
          if (node.isBone) {
            cloneBones[node.name] = node
          }

          if (node.isSkinnedMesh) {
            cloneSkinnedMeshes[node.name] = node
          }
        })

        for (let name in skinnedMeshes) {
          const skinnedMesh = skinnedMeshes[name]
          const skeleton = skinnedMesh.skeleton
          const cloneSkinnedMesh = cloneSkinnedMeshes[name]

          const orderedCloneBones = []

          for (let i = 0; i < skeleton.bones.length; ++i) {
            const cloneBone = cloneBones[skeleton.bones[i].name]
            orderedCloneBones.push(cloneBone)
          }

          cloneSkinnedMesh.bind(new THREE.Skeleton(orderedCloneBones, skeleton.boneInverses), cloneSkinnedMesh.matrixWorld)
        }

        return clone
      }

      const characterFactory = data => {
        data = cloneGltf(data)

        //console.log('factory got data: ', data)
        let boneLengthScale = 1
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

        let mesh
        let skeleton
        let armatures
        let parentRotation = new THREE.Quaternion()
        let parentPosition = new THREE.Vector3()

        let lods = data.scene.children.filter(child => child instanceof THREE.SkinnedMesh)
        if (lods.length === 0) lods = data.scene.children[0].children.filter(child => child instanceof THREE.SkinnedMesh)

        if (lods.length > 1) {
          mesh = new THREE.LOD()
          lods.forEach((lod, i) => {
            mesh.addLevel(lod, i * 2)
          })
        } else {
          mesh = lods[0]
        }

        if (mesh == null) {
          mesh = new THREE.Mesh()
          skeleton = null
          armatures = null
          let originalHeight = 0

          return { mesh, skeleton, armatures, originalHeight, boneLengthScale, parentRotation, parentPosition }
        }

        armatures = data.scene.children[0].children.filter(child => child instanceof THREE.Bone)
        if (armatures.length === 0) {
          // facebook export is different - bone structure is inside another object3D
          armatures = data.scene.children[0].children[0].children.filter(child => child instanceof THREE.Bone)

          if (armatures.length === 0) {
            //specifically adult-female - bone structure is inside the skinned mesh
            armatures = mesh.children[0].children.filter(child => child instanceof THREE.Bone)
          }
          for (var bone of armatures) {
            bone.scale.set(1, 1, 1)
            bone.quaternion.multiply(data.scene.children[0].children[0].quaternion)
            bone.position.set(bone.position.x, bone.position.z, bone.position.y)
          }

          if (mesh.type === 'LOD') {
            mesh.children.forEach(lod => {
              lod.scale.set(1, 1, 1)
            })
          } else {
            mesh.scale.set(1, 1, 1)
          }

          parentRotation = data.scene.children[0].children[0].quaternion.clone()
          parentPosition = armatures[0].position.clone()
          boneLengthScale = 100
        }


        if (mesh.type === 'LOD') {
          skeleton = mesh.children[0].skeleton

          mesh.children.forEach(lod => {
            if (lod.material.map) {
              material.map = lod.material.map
              material.map.needsUpdate = true
            }

            lod.material = material
            lod.renderOrder = 1.0
          })
        } else {
          skeleton = mesh.skeleton

          if (mesh.material.map) {
            material.map = mesh.material.map
            material.map.needsUpdate = true
          }

          mesh.material = material
          mesh.renderOrder = 1.0
        }

        let bbox = new THREE.Box3().setFromObject(mesh)
        let originalHeight = bbox.max.y - bbox.min.y

        return { mesh, skeleton, armatures, originalHeight, boneLengthScale, parentRotation, parentPosition }
      }

      const fixRootBone = ({ boneLengthScale, skeletonProps, skeletonObject3d }) => {
        // fb converter scaled object
        if (boneLengthScale === 100) {
          if (skeletonProps['Hips']) {
            // we already have correct values, don't multiply the root bone
          } else {
            skeletonObject3d.bones[0].quaternion.multiply(parentRotation)
          }
          skeletonObject3d.bones[0].position.copy(parentPosition)
        }
      }

      const {
        mesh,
        skeleton,
        armatures,
        originalHeight,
        boneLengthScale,
        parentRotation,
        parentPosition
      } = characterFactory(modelData)

      group.scale.setScalar(1/originalHeight)
      // mesh.skeleton.pose()
      mesh.skeleton.getBoneByName('Hips').rotation.x += Math.PI / 2.0
      fixRootBone({ boneLengthScale, skeletonProps: {}, skeletonObject3d: mesh.skeleton })

      group.add(mesh)
      group.add(armatures[0])



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

    switch (model.type) {
      case 'character':
        group.position.y = -0.5
        camera.position.z = 1
        camera.position.y = 0
        break
    }

    switch (model.id) {
      case 'teen-male':
      case 'teen-female':
        group.scale.multiplyScalar(0.94)
        group.rotation.y = Math.PI/20
        break

      case 'box':
        camera.position.y -= 1
        camera.position.x += 0.05
        group.rotation.x = (Math.PI/180)*22
        group.rotation.y = (Math.PI/180)*22
        break

      case 'bed-full':
      case 'bed-king':
      case 'bed-twin':
      case 'table-counter':
        camera.position.z += 1.2
        camera.position.y -= 0.2
        if (model.id === 'bed-twin') {
          group.position.y -= 0.15
        }
        group.rotation.y = (Math.PI/180)*90
        break

      case 'chair-sofa-wide':
        camera.position.z += 1.5
        camera.position.x -= 0.25
        group.position.y = -0.25
        group.rotation.y += (Math.PI/180)*45
        break

      case 'table-sit-rectangle':
        camera.position.z += 1.5
        group.rotation.y = 0
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
    'img', { src, width: 68, title: model.id, style: { margin: 4 } }
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
    .filter(o => o.type === 'character' || o.type === 'object')

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
