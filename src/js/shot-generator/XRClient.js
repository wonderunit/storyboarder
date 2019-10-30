const ModelLoader = require('../services/model-loader')

const THREE = require('three')
window.THREE = window.THREE || THREE
const TWEEN = require('@tweenjs/tween.js');
window.TWEEN = TWEEN

const React = require('react')
const { useRef, useEffect, useState } = React

const {gltfLoader} = require('./Components')

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

const getEmptyObj = () => {
  return {
    state: {
      worldRotation1: new THREE.Quaternion(),
      worldRotation0: new THREE.Quaternion(),
      worldPosition: new THREE.Vector3(),
      worldScale: new THREE.Vector3(),
      worldMatrix: new THREE.Matrix4()
    },
    object: new THREE.Object3D()
  }
}

const loadModels = (models) => {
  return Promise.all(
      models.map((modelPath) => {
        return new Promise((resolve, reject) => {
          gltfLoader.load(
              modelPath,
              modelData => resolve(modelData.scene),
              null,
              reject
          )
        })
      })
  )
}

const XRClient = React.memo(({ scene, id, type, isSelected, loaded, updateObject, remoteInput, storyboarderFilePath, camera, ...props }) => {
  const setLoaded = loaded => updateObject(id, { loaded })

  const container = useRef()
  
  const head = getEmptyObj()
  const controls = [getEmptyObj(), getEmptyObj()]
  
  //.easing(TWEEN.Easing.Quadratic.Out) // Use an easing function to make the animation smooth.
  let tween = new TWEEN.Tween({})
  
  // This doesn't work with tween@18.3.1
  const setTweenData = () => {
    if (tween) {
      tween.stop()
    }
  
    head.state.worldRotation0.copy(head.object.quaternion)
    controls[0].state.worldRotation0.copy(controls[0].object.quaternion)
    controls[1].state.worldRotation0.copy(controls[1].object.quaternion)
  
    tween = new TWEEN.Tween({
      x: head.object.position.x,
      y: head.object.position.y,
      z: head.object.position.z,
      xc1: controls[0].object.position.x,
      yc1: controls[0].object.position.y,
      zc1: controls[0].object.position.z,
      xc2: controls[1].object.position.x,
      yc2: controls[1].object.position.y,
      zc2: controls[1].object.position.z,
      deltaTime: 0
    })
    
    tween.to({
      x: head.state.worldPosition.x,
      y: head.state.worldPosition.y,
      z: head.state.worldPosition.z,
      xc1: controls[0].state.worldPosition.x,
      yc1: controls[0].state.worldPosition.y,
      zc1: controls[0].state.worldPosition.z,
      xc2: controls[1].state.worldPosition.x,
      yc2: controls[1].state.worldPosition.y,
      zc2: controls[1].state.worldPosition.z,
      deltaTime: 1
    }, 200)
    
    // TODO There must be an easier way to update values
    tween.onUpdate(({ x, y, z, xc1, yc1, zc1, xc2, yc2, zc2, deltaTime }) => {
      head.object.position.x = x
      head.object.position.y = y
      head.object.position.z = z
  
      controls[0].object.position.x = xc1
      controls[0].object.position.y = yc1
      controls[0].object.position.z = zc1
  
      controls[1].object.position.x = xc2
      controls[1].object.position.y = yc2
      controls[1].object.position.z = zc2
  
  
      THREE.Quaternion.slerp(
          head.state.worldRotation0,
          head.state.worldRotation1,
          head.object.quaternion,
          deltaTime
      )
  
      THREE.Quaternion.slerp(
          controls[0].state.worldRotation0,
          controls[0].state.worldRotation1,
          controls[0].object.quaternion,
          deltaTime
      )
  
      THREE.Quaternion.slerp(
          controls[1].state.worldRotation0,
          controls[1].state.worldRotation1,
          controls[1].object.quaternion,
          deltaTime
      )
    })
    
    tween.start()
  }
  
  let controllerIndex, controller
  const update = (data) => {
    head.state.worldMatrix.fromArray(data.cameraMatrix)
    head.state.worldMatrix.decompose(head.state.worldPosition, head.state.worldRotation1, head.state.worldScale)
    
    for(controllerIndex = 0; controllerIndex < data.controllers.length; controllerIndex++) {
      controller = data.controllers[controllerIndex]
      controls[controllerIndex].state.worldMatrix.fromArray(controller.matrix)
      controls[controllerIndex].state.worldMatrix.decompose(
          controls[controllerIndex].state.worldPosition,
          controls[controllerIndex].state.worldRotation1,
          controls[controllerIndex].state.worldScale
      )
    }
    
    setTweenData()
  }

  useEffect(() => {
    let expectedHeadsetFilepath = ModelLoader.getFilepathForModel({
      model: 'hmd',
      type: 'xr'
    }, { storyboarderFilePath })
  
    let expectedControllerFilepath = ModelLoader.getFilepathForModel({
      model: 'controller',
      type: 'xr'
    }, { storyboarderFilePath })
  
    console.log(type, id, 'XR CLIENT added to the scene')
    container.current = groupFactory()
    container.current.userData.id = id
    container.current.userData.type = type
  
    // FIXME DIRTY HACK v1.0, allows to update object without dispatching an event
    window.connectedClient[id] = {update}
    scene.add(container.current)
  
    loadModels([
      expectedHeadsetFilepath,
      expectedControllerFilepath
    ]).then(([headModel, controllerModel]) => {
    
      container.current.remove(...container.current.children)
      head.object.remove(...head.object.children)
      controls[0].object.remove(...controls[0].object.children)
      controls[1].object.remove(...controls[1].object.children)
  
      headModel.traverse( function ( child ) {
        if ( child instanceof THREE.Mesh ) {
          let mesh = meshFactory(child.clone())
          mesh.rotateY(Math.PI)
          head.object.add(mesh)
        }
      })
  
      controllerModel.traverse( function ( child ) {
        if ( child instanceof THREE.Mesh ) {
          controls[0].object.add(meshFactory(child.clone()))
          controls[1].object.add(meshFactory(child.clone()))
        }
      })
    
      head.object.children[1].material.color.setRGB(0.15, 0.0, 0.8)
      head.object.children[2].material.color.setRGB(0.15, 0.0, 0.8)
      
      container.current.add(head.object)
      container.current.add(controls[0].object)
      container.current.add(controls[1].object)
      
      setLoaded(true)
    
    }).catch((error) => {
      console.error(error)
      setLoaded(undefined)
    })

    return function cleanup () {
      console.log(type, id, 'XR CLIENT removed from scene')
      scene.remove(container.current.orthoIcon)
      scene.remove(container.current)
      Reflect.deleteProperty(window.connectedClient, id)
    }
  }, [])
  
  useEffect(() => {
    container.current.visible = props.visible
  }, [
    props.visible
  ])
  
  useEffect(() => {
    container.current.traverse((obj) => {
      if (obj.isMesh) {
        obj.material.userData.outlineParameters = {
          thickness: 0.008,
          color: [ 0, 0, 0 ]
        }
      }
    })
  }, [isSelected, loaded])

  return null
})

module.exports = XRClient
