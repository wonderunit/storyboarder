const THREE = require('three')
window.THREE = window.THREE || THREE
const RoundedBoxGeometry = require('three-rounded-box')(THREE)

const React = require('react')
const { useRef, useEffect } = React

// TODO use functions of ModelLoader?
require('../../../node_modules/three/examples/js/loaders/LoaderSupport')
require('../../../node_modules/three/examples/js/loaders/GLTFLoader')
require('../../../node_modules/three/examples/js/loaders/OBJLoader2')
const loadingManager = new THREE.LoadingManager()
const objLoader = new THREE.OBJLoader2(loadingManager)
const gltfLoader = new THREE.GLTFLoader(loadingManager)
const imageLoader = new THREE.ImageLoader(loadingManager)
objLoader.setLogging(false, false)

const boxRadius = .005
const boxRadiusSegments = 5

const SceneObject = React.memo(({ scene, id, type, objModels, isSelected, ...object }) => {
  let container = useRef(new THREE.Group())

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
    switch (model) {
      case 'box':
        geometry = new RoundedBoxGeometry( object.width, object.height, object.depth, boxRadius, boxRadiusSegments )
        let material = new THREE.MeshBasicMaterial( { color: 0xcccccc, side: THREE.DoubleSide } )
        let mesh = new THREE.Mesh( geometry, material )
        geometry.translate( 0, object.height / 2, 0 )
        container.remove(...container.children)
        container.add(mesh)
        break

      default:
        container.remove(...container.children)
        container.add(objModels[model].clone())
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
  }, [isSelected])

  return null
})

module.exports = SceneObject
