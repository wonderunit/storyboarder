const THREE = require('three')
window.THREE = window.THREE || THREE
const RoundedBoxGeometry = require('three-rounded-box')(THREE)

const path = require('path')
const React = require('react')
const { useRef, useEffect, useState } = React

const ModelLoader = require('../services/model-loader')

// TODO use functions of ModelLoader?
require('../../../node_modules/three/examples/js/loaders/LoaderSupport')
require('../../../node_modules/three/examples/js/loaders/GLTFLoader')
require('../../../node_modules/three/examples/js/loaders/OBJLoader2')
const loadingManager = new THREE.LoadingManager()
const objLoader = new THREE.OBJLoader2(loadingManager)
const gltfLoader = new THREE.GLTFLoader(loadingManager)
const imageLoader = new THREE.ImageLoader(loadingManager)
objLoader.setLogging(false, false)
THREE.Cache.enabled = true

const boxRadius = .005
const boxRadiusSegments = 5

// return a group which can report intersections
const groupFactory = () => {
  let group = new THREE.Group()
  group.raycast = function ( raycaster, intersects ) {
    let results = raycaster.intersectObjects(this.children)
    if (results.length) {
      // distance – distance between the origin of the ray and the intersection
      // point – point of intersection, in world coordinates
      // face – intersected face
      // faceIndex – index of the intersected face
      // object – the intersected object
      // uv - U,V coordinates at point of intersection
      intersects.push({ object: this })
    }
  }
  return group
}

const materialFactory = () => new THREE.MeshToonMaterial({
  color: 0xffffff,
  emissive: 0x0,
  specular: 0x0,
  skinning: true,
  shininess: 0,
  flatShading: false
})

const SceneObject = React.memo(({ scene, id, type, objModels, isSelected, ...object }) => {
  const [loaded, setLoaded] = useState(false)
  const container = useRef(groupFactory())

  const update = () => {
    container.current.userData.id = id
    container.current.userData.type = type

    container.current.position.x = object.x
    container.current.position.z = object.y
    container.current.position.y = object.z

    container.current.rotation.y = object.rotation

    container.current.scale.set(
      object.width,
      object.height,
      object.depth
    )

    container.current.visible = object.visible
  }
  
  const load = async (model, object, container) => {
    setLoaded(false)

    switch (model) {
      case 'box':
        geometry = new RoundedBoxGeometry( 1, 1, 1, boxRadius, boxRadiusSegments )
        let material = new THREE.MeshBasicMaterial( { color: 0xcccccc, side: THREE.DoubleSide } )
        let mesh = new THREE.Mesh( geometry, material )
        geometry.translate( 0, 1 / 2, 0 )
        container.remove(...container.children)
        container.add(mesh)
        setLoaded(true)
        break

      default:
        container.remove(...container.children)

        let filepath
        if (ModelLoader.isCustomModel(model)) {
          filepath = model
          console.log('loading a model from the file system', filepath)
        } else {

          // FIXME doesn't return the correct value when run from `npm run shot-generator`
          // https://github.com/electron-userland/electron-webpack/issues/243
          // const { app } = require('electron').remote
          // filepath = path.join(app.getAppPath(), 'src', 'data', 'shot-generator', 'objects', model + '.obj')

          filepath = path.join(__dirname, '..', '..', '..', 'src', 'data', 'shot-generator', 'objects', model + '.obj')
          console.log('loading from app', filepath)
        }

        switch (path.extname(filepath)) {
          case '.obj':
            await new Promise((resolve, reject) => {
              objLoader.load(
                filepath, event => {
                  const object = event.detail.loaderRootNode

                  object.traverse( function ( child ) {
                    if ( child instanceof THREE.Mesh ) {
                      let m = child.clone()
                      m.material = materialFactory()
                      container.add(m)
                    }
                  })
                  resolve()
                },
                null,
                error => reject(error)
              )
            })
            console.log('loaded', filepath)
            setLoaded(true)
            break
        
          case '.gltf':
          case '.glb':
            // TODOO reject
            await new Promise(resolve => {
              gltfLoader.load(
                filepath,
                data => {
                  // add every single mesh we find
                  data.scene.traverse(child => {
                    if ( child instanceof THREE.Mesh ) {
                      let m = child.clone()
                      m.material = materialFactory()
                      container.add(m)
                    }
                  })
                  resolve()
                },
                null,
                error => {
                  reject(error)
                }
              )
            })
            console.log('loaded', filepath)
            setLoaded(true)
            break
        }
        break
    }
  }

  useEffect(() => {
    console.log(type, id, 'model changed', container.current, 'to', object.model)
    load(object.model, object, container.current)
    update()

    console.log(type, id, 'added to scene')
    scene.add(container.current)

    return function cleanup () {
      console.log(type, id, 'removed from scene')
      scene.remove(container.current)
    }
  }, [object.model])

  useEffect(() => {
    console.log(type, id, 'update')
    update()
  }, [
    object.x,
    object.y,
    object.z,
    object.rotation,
    object.width,
    object.height,
    object.depth,
    object.visible
  ])

  useEffect(() => {
    if (!container.current.children[0]) return
    if (!container.current.children[0].material) return

    container.current.children[0].material.userData.outlineParameters =
      isSelected
        ? {
          thickness: 0.015,
          color: [ 0.7, 0.0, 0.0 ]
        }
       : {
         thickness: 0.008,
         color: [ 0, 0, 0 ],
       }
  }, [isSelected, loaded])

  return null
})

module.exports = SceneObject
