const ModelLoader = require('../services/model-loader')

const THREE = require('three')
window.THREE = window.THREE || THREE
const RoundedBoxGeometry = require('three-rounded-box')(THREE)
const TWEEN = require('@tweenjs/tween.js');
window.TWEEN = TWEEN

const path = require('path')
const React = require('react')
const { useRef, useEffect, useState } = React

const {gltfLoader} = require('./Components')

const applyDeviceQuaternion = require('./apply-device-quaternion')
const IconSprites = require('./IconSprites')

const boxRadius = .005
const boxRadiusSegments = 5

const materialFactory = () => new THREE.MeshToonMaterial({
  color: 0xcccccc,
  emissive: 0x0,
  specular: 0x0,
  shininess: 0,
  flatShading: false
})

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



const meshFactory = originalMesh => {
  let mesh = originalMesh.clone()
  mesh.geometry.computeBoundingBox()
  
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

const XRClient = React.memo(({ scene, id, type, isSelected, loaded, updateObject, remoteInput, storyboarderFilePath, camera, ...props }) => {
  const setLoaded = loaded => updateObject(id, { loaded })

  const container = useRef()
  
  const worldRotation1 = new THREE.Quaternion()
  const worldRotation0 = new THREE.Quaternion()
  const worldPosition = new THREE.Vector3()
  const worldScale = new THREE.Vector3()
  const worldMatrix = new THREE.Matrix4()
  
  //.easing(TWEEN.Easing.Quadratic.Out) // Use an easing function to make the animation smooth.
  let tween = new TWEEN.Tween({})
  
  // This doesn't work with tween@18.3.1
  const setTweenData = () => {
    if (tween) {
      tween.stop()
    }
  
    worldRotation0.copy(container.current.quaternion)
  
    tween = new TWEEN.Tween({
      x: container.current.position.x,
      y: container.current.position.y,
      z: container.current.position.z,
      deltaTime: 0
    })
    
    tween.to({
      x: worldPosition.x,
      y: worldPosition.y,
      z: worldPosition.z,
      deltaTime: 1
    }, 200)
    
    tween.onUpdate(({ x, y, z, deltaTime }) => {
      container.current.position.x = x
      container.current.position.y = y
      container.current.position.z = z
      THREE.Quaternion.slerp(worldRotation0, worldRotation1, container.current.quaternion, deltaTime)
    })
    
    tween.start()
  }
  
  const updateMatrix = (matrix) => {
    worldMatrix.fromArray(matrix)
    worldMatrix.decompose(worldPosition, worldRotation1, worldScale)
  
    setTweenData()
  }

  useEffect(() => {
    
    let expectedFilepath = ModelLoader.getFilepathForModel({
      model: 'hmd',
      type: 'xr'
    }, { storyboarderFilePath })
  
    console.log(type, id, 'XR CLIENT added to the scene')
    container.current = groupFactory()
    container.current.userData.id = id
    container.current.userData.type = type
  
    window.connectedClientModels[id] = {updateMatrix}
    scene.add(container.current)
  
    gltfLoader.load(
        expectedFilepath,
        modelData => {
          container.current.remove(...container.current.children)
          
          modelData.scene.traverse( function ( child ) {
            if ( child instanceof THREE.Mesh ) {
              let mesh = meshFactory(child.clone())
              mesh.rotateY(Math.PI)
              container.current.add(mesh)
            }
          })
          
          container.current.children[1].material.color.setRGB(0.15, 0.0, 0.8)
          container.current.children[2].material.color.setRGB(0.15, 0.0, 0.8)
  
          setLoaded(true)
        },
        null,
        error => {
          console.error(error)
          setLoaded(undefined)
        }
    )

    return function cleanup () {
      console.log(type, id, 'XR CLIENT removed from scene')
      scene.remove(container.current.orthoIcon)
      scene.remove(container.current)
      Reflect.deleteProperty(window.connectedClientModels, id)
    }
  }, [])
  
  useEffect(() => {
    container.current.visible = props.visible
  }, [
    props.visible
  ])
  
  useEffect(() => {
    if (!container.current.children[0]) return
    if (!container.current.children[0].material) return
    
    for(let i = 0; i < container.current.children.length; i++) {
      container.current.children[i].material.userData.outlineParameters = {
        thickness: 0.008,
        color: [ 0, 0, 0 ]
      }
    }
  }, [isSelected])

  return null
})

module.exports = XRClient
