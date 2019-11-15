const THREE = require('three')
window.THREE = window.THREE || THREE
const RoundedBoxGeometry = require('three-rounded-box')(THREE)

const path = require('path')
const React = require('react')
const { useRef, useEffect, useState } = React

const { dialog } = require('electron').remote
const fs = require('fs')
const ModelLoader = require('../../services/model-loader')

const applyDeviceQuaternion = require('../apply-device-quaternion')
const IconSprites = require('../IconSprites')

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

const Accessory =  React.memo(({ scene, id, updateObject, sceneObject, loaded, modelData, ...props }) => {
  //const setLoaded = loaded => updateObject(id, { loaded })
  const container = useRef()

  useEffect(() => {
      console.log('added', props)
      //let passedModel = { id: props.model, type: props.type }
     // let filePath = filepathFor(passedModel)
     // let object = attachments[filePath].value
   
      container.current = groupFactory()
      container.current.userData.id = id
      container.current.userData.type = props.type
  
      //container.current.orthoIcon = new IconSprites( props.type, "", container.current )
      //scene.add(container.current.orthoIcon)
  
      //console.log(type, id, 'added to scene')
      scene.add(container.current)
  
      return function cleanup () {
        console.log(type, id, 'removed from scene')
        scene.remove(container.current.orthoIcon)
        scene.remove(container.current)
      }
  }, [])    

  useEffect(() => {
    if (!loaded && modelData) {
      //console.log(type, id, 'got modelData')
      container.current.remove(...container.current.children)
    
      // console.log('scene object', path.extname(props.model), modelData)

      try {
        // add a clone of every single mesh we find
        modelData.scene.traverse( function ( child ) {
          if ( child instanceof THREE.Mesh ) {
            container.current.add(meshFactory(child))
          }
        })
        // console.log('loaded', props.model)
        //setLoaded(true)
        } catch (err) {
        console.error(err)

        // HACK `undefined` means error
       // setLoaded(undefined)
      }
      let skinnedMesh = scene.children.filter(child => child.userData.id === sceneObject.id)[0].getObjectByProperty("type", "SkinnedMesh")
      let skeleton = skinnedMesh.skeleton
      let bone = skeleton.getBoneByName(props.bindBone)
      container.current.applyMatrix(skinnedMesh.getInverseMatrixWorld())
      //console.log(skinnedMesh)
      container.current.position.set(0, 0, 0)
      container.current.quaternion.set(0, 0, 0, 1)
      bone.add(container.current)
    }
  }, [modelData, loaded])
    
})

module.exports = Accessory
