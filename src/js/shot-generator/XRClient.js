const ModelLoader = require('../services/model-loader')

const THREE = require('three')
window.THREE = window.THREE || THREE

const React = require('react')
const { useRef, useEffect } = React

const {gltfLoader} = require('./Components')

const {connectedClient, sendClientInfo} = require("../xr/socket-server")
const getObjectTween = require('../utils/objectTween')

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
  
  let updateHead = getObjectTween({current: head.object})
  let updateControl1 = getObjectTween({current: controls[0].object})
  let updateControl2 = getObjectTween({current: controls[1].object})
  
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
  
    sendClientInfo(id, {
      head: {
        pos: head.state.worldPosition,
        rot: head.state.worldRotation1
      },
      controls: [
        {
          pos: controls[0].state.worldPosition,
          rot: controls[0].state.worldRotation1
        },
        {
          pos: controls[1].state.worldPosition,
          rot: controls[1].state.worldRotation1
        }
      ]
    })
  
    updateHead(head.state.worldPosition, head.state.worldRotation1, 200)
    updateControl1(controls[0].state.worldPosition, controls[0].state.worldRotation1, 200)
    updateControl2(controls[1].state.worldPosition, controls[1].state.worldRotation1, 200)
  }
  
  const setControllersCount = (count) => {
    controls[0].object.visible = false
    controls[1].object.visible = false
    for(let i = 0; i < count; i++) {
      controls[i].object.visible = true
    }
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
    
    container.current = groupFactory()
    container.current.userData.id = id
    container.current.userData.type = type
  
    // FIXME DIRTY HACK v1.0, allows to update object without dispatching an event
    connectedClient[id] = {
      update,
      setControllersCount,
      parts: {
        head: {
          position: head.state.worldPosition,
          rotation: head.state.worldRotation1
        },
        controls: [
          {
            position: controls[0].state.worldPosition,
            rotation: controls[0].state.worldRotation1
          },
          {
            position: controls[1].state.worldPosition,
            rotation: controls[1].state.worldRotation1
          }
        ]
      }
    }
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
          let mesh = meshFactory(child)
          mesh.rotateY(Math.PI)
          head.object.add(mesh)
        }
      })
  
      controllerModel.traverse( function ( child ) {
        if ( child instanceof THREE.Mesh ) {
          controls[0].object.add(meshFactory(child))
          controls[1].object.add(meshFactory(child))
        }
      })
    
      head.object.children[1].material.color.setRGB(0.15, 0.0, 0.8)
      head.object.children[2].material.color.setRGB(0.15, 0.0, 0.8)
      
      container.current.add(head.object)
      container.current.add(controls[0].object)
      container.current.add(controls[1].object)
      setControllersCount(0)
      
      setLoaded(true)
    }).catch((error) => {
      console.error(error)
      setLoaded(undefined)
    })

    return function cleanup () {
      console.log(type, id, 'XR CLIENT removed from scene')
      scene.remove(container.current.orthoIcon)
      scene.remove(container.current)
      Reflect.deleteProperty(connectedClient, id)
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
