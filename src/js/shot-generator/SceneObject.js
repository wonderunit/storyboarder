const THREE = require('three')
window.THREE = window.THREE || THREE
const RoundedBoxGeometry = require('three-rounded-box')(THREE)

const path = require('path')
const React = require('react')
const { useRef, useEffect, useState } = React

const { dialog } = require('electron').remote
const fs = require('fs')
const ModelLoader = require('../services/model-loader')

const applyDeviceQuaternion = require('./apply-device-quaternion')
const prepareFilepathForModel = require('./prepare-filepath-for-model')
const IconSprites = require('./IconSprites')

// TODO use functions of ModelLoader?
require('../vendor/three/examples/js/loaders/LoaderSupport')
require('../vendor/three/examples/js/loaders/GLTFLoader')
require('../vendor/three/examples/js/loaders/OBJLoader2')
const loadingManager = new THREE.LoadingManager()
const objLoader = new THREE.OBJLoader2(loadingManager)
const gltfLoader = new THREE.GLTFLoader(loadingManager)
const imageLoader = new THREE.ImageLoader(loadingManager)


objLoader.setLogging(false, false)

THREE.Cache.enabled = true

let MODEL_CACHE = {}

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
  color: 0xcccccc,
  emissive: 0x0,
  specular: 0x0,
  shininess: 0,
  flatShading: false
})

const meshFactory = originalMesh => {
  let mesh = originalMesh.clone()

  // create a skeleton if one is not provided
  if (mesh instanceof THREE.SkinnedMesh && !mesh.skeleton) {
    mesh.skeleton = new THREE.Skeleton()
  }

  let material = materialFactory()

  if (mesh.material.map) {
    material.map = mesh.material.map
    material.map.needsUpdate = true
  }
  mesh.material = material

  return mesh
}

const SceneObject = React.memo(({ scene, id, type, isSelected, loaded, updateObject, remoteInput, camera, storyboarderFilePath, ...object }) => {
  const setLoaded = loaded => updateObject(id, { loaded })

  const container = useRef(groupFactory())

  const load = async (model, object, container) => {
    setLoaded(false)

    switch (model) {
      case 'box':
        geometry = new RoundedBoxGeometry( 1, 1, 1, boxRadius, boxRadiusSegments )
        let material = materialFactory()
        let mesh = new THREE.Mesh( geometry, material )
        geometry.translate( 0, 1 / 2, 0 )
        container.remove(...container.children)
        container.add(mesh)
        setLoaded(true)
        break

      default:
        container.remove(...container.children)

        let filepath = await prepareFilepathForModel({
          id,
          model,
          type,

          storyboarderFilePath,

          onFilePathChange: filepath => {
            // new relative path
            updateObject(id, { model: filepath })
          }
        })

        if (!filepath) {
          return
        }

        switch (path.extname(filepath)) {
          case '.obj':
            try {
              if (!MODEL_CACHE[filepath]) {
                MODEL_CACHE[filepath] = await new Promise((resolve, reject) => {
                  objLoader.load(
                    filepath,
                    event => resolve(event.default.loaderRootNode),
                    null,
                    error => reject(error)
                  )
                })
              }

              let object = MODEL_CACHE[filepath]
              object.traverse( function ( child ) {
                if ( child instanceof THREE.Mesh ) {
                  container.add(meshFactory(child))
                }
              })

              console.log('loaded', filepath)
              setLoaded(true)
            } catch (err) {
              console.error(err)
              setLoaded(undefined)
            }
            break

          case '.gltf':
          case '.glb':
            try {
              if (!MODEL_CACHE[filepath]) {
                MODEL_CACHE[filepath] = await new Promise((resolve, reject) => {
                  gltfLoader.load(
                    filepath,
                    data => resolve(data),
                    null,
                    error => reject(error)
                  )
                })
              }

              let data = MODEL_CACHE[filepath]

              // add every single mesh we find
              data.scene.traverse(child => {
                if ( child instanceof THREE.Mesh ) {
                  container.add(meshFactory(child))
                }
              })

              console.log('loaded', filepath)
              setLoaded(true)

            } catch (err) {
              console.error(err)
              // HACK undefined == error
              setLoaded(undefined)
            }
            break

          default:
            alert('Could not load file.')
            setLoaded(undefined)
        }
        break
    }
  }

  useEffect(() => {
    console.log(type, id, 'model changed', container.current, 'to', object.model)
    load(object.model, object, container.current)

    container.current.userData.id = id
    container.current.userData.type = type

    console.log(type, id, 'added to scene')
    scene.add(container.current)
    
    container.current.orthoIcon = new IconSprites( type, "", container.current )
    //scene.add(container.current.orthoIcon)

    return function cleanup () {
      console.log(type, id, 'removed from scene')
      scene.remove(container.current.orthoIcon)
      scene.remove(container.current)
    }
  }, [object.model])

  useEffect(() => {
    container.current.position.x = object.x
    container.current.position.z = object.y
    container.current.position.y = object.z
    container.current.orthoIcon.position.copy(container.current.position)
  }, [
    object.x,
    object.y,
    object.z
  ])

  useEffect(() => {
    container.current.rotation.x = object.rotation.x
    container.current.rotation.y = object.rotation.y
    container.current.rotation.z = object.rotation.z
    container.current.orthoIcon.icon.rotation = object.rotation.y
  }, [
    object.rotation.x,
    object.rotation.y,
    object.rotation.z
  ])

  useEffect(() => {
    container.current.scale.set(
      object.width,
      object.height,
      object.depth
    )
    container.current.orthoIcon.scale.set(object.width+0.2, object.depth+0.2, 1)
  }, [
    object.width,
    object.height,
    object.depth
  ])

  useEffect(() => {
    container.current.visible = object.visible
  }, [
    object.visible
  ])

  useEffect(() => {
    if (!container.current.children[0]) return
    if (!container.current.children[0].material) return

    container.current.children[0].material.userData.outlineParameters =
      isSelected
        ? {
          //thickness: 0.008,
          color: [ 122/256.0/2, 114/256.0/2, 233/256.0/2 ]
        }
       : {
         //thickness: 0.008,
         color: [ 0, 0, 0 ],
       }
  }, [isSelected, loaded])

  const isRotating = useRef(null)
  const startingObjectQuaternion = useRef(null)
  const startingDeviceOffset = useRef(null)
  const startingObjectOffset = useRef(null)
  const offset = useRef(0)

  useEffect(() => {
    if (!container.current) return
    if (!isSelected) return

    if (remoteInput.mouseMode) return

    let target = container.current

    if (remoteInput.down) {
      let [ alpha, beta, gamma ] = remoteInput.mag.map(THREE.Math.degToRad)
      let magValues = remoteInput.mag
    
      let deviceQuaternion = new THREE.Quaternion()

      if (!isRotating.current) {
        // new rotation
        isRotating.current = true

        offset.current = 0-magValues[0]
        console.log('new rotation!')

        deviceQuaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler(beta, alpha + (offset.current*(Math.PI/180)),-gamma, 'YXZ')).multiply(new THREE.Quaternion().setFromAxisAngle( new THREE.Vector3( 1, 0, 0 ), -Math.PI / 2 ))
        // get the starting device rotation and starting target object rotation
        startingDeviceOffset.current = new THREE.Quaternion()
          .clone()
          .inverse()
          .multiply(deviceQuaternion)
          .normalize()
          .inverse()

        startingObjectQuaternion.current = target.quaternion.clone()

        startingObjectOffset.current = new THREE.Quaternion()
          .clone()
          .inverse()
          .multiply(startingObjectQuaternion.current)
      } else {
        deviceQuaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler(beta, alpha + (offset.current*(Math.PI/180)),-gamma, 'YXZ')).multiply(new THREE.Quaternion().setFromAxisAngle( new THREE.Vector3( 1, 0, 0 ), -Math.PI / 2 ))
      }
      //console.log('rotation with offset: ', offset.current)

      let objectQuaternion = applyDeviceQuaternion({
        parent: target.parent,
        startingDeviceOffset: startingDeviceOffset.current,
        startingObjectOffset: startingObjectOffset.current,
        startingObjectQuaternion: startingObjectQuaternion.current,
        deviceQuaternion,
        camera
      })

      // GET THE DESIRED ROTATION FOR THE TARGET OBJECT
      let rotation = new THREE.Euler()
        .setFromQuaternion( objectQuaternion.normalize(), "YXZ" )

      
      updateObject(target.userData.id, {
        rotation: { x: rotation.x, y: rotation.y, z: rotation.z }
      })

    } else {
      // not pressed anymore, reset
      isRotating.current = false

      startingDeviceOffset.current = null
      startingObjectQuaternion.current = null
      startingObjectOffset.current = null
    }
  }, [remoteInput])

  return null
})

module.exports = SceneObject
