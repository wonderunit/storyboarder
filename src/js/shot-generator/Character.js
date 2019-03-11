const THREE = require('three')
window.THREE = window.THREE || THREE

const React = require('react')
const { useRef, useEffect, useState } = React

const path = require('path')

const BonesHelper = require('./BonesHelper')
const IconSprites = require('./IconSprites')

const { initialState } = require('../shared/reducers/shot-generator')

const applyDeviceQuaternion = require('./apply-device-quaternion')
const prepareFilepathForModel = require('./prepare-filepath-for-model')

// character needs:
//   mesh - SkinnedMesh
//   bone structure - ideally Mixamo standard bones
//

// TODO use functions of ModelLoader?
require('../vendor/three/examples/js/loaders/LoaderSupport')
require('../vendor/three/examples/js/loaders/GLTFLoader')
require('../vendor/three/examples/js/loaders/OBJLoader2')
const loadingManager = new THREE.LoadingManager()
const objLoader = new THREE.OBJLoader2(loadingManager)
const gltfLoader = new THREE.GLTFLoader(loadingManager)
objLoader.setLogging(false, false)
THREE.Cache.enabled = true

const loadGltf = filepath => 
  new Promise((resolve, reject) =>
    gltfLoader.load(
      filepath,
      data => resolve(data),
      null,
      error => reject(error)
    ))

const isValidSkinnedMesh = data => {
  let mesh = data.scene.children.find(child => child instanceof THREE.SkinnedMesh) ||
            data.scene.children[0].children.find(child => child instanceof THREE.SkinnedMesh)
  return (mesh != null)
}

const characterFactory = data => {
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
  mesh = data.scene.children.find(child => child instanceof THREE.SkinnedMesh) ||
         data.scene.children[0].children.find(child => child instanceof THREE.SkinnedMesh)

  armatures = data.scene.children[0].children.filter(child => child instanceof THREE.Bone)
  if (armatures.length === 0 ) {  // facebook export is different - bone structure is inside another object3D
    armatures = data.scene.children[0].children[0].children.filter(child => child instanceof THREE.Bone)

    if (armatures.length === 0) {  //specifically adult-female - bone structure is inside the skinned mesh
      armatures = mesh.children[0].children.filter(child => child instanceof THREE.Bone)
    }
    for (var bone of armatures)
    {
      bone.scale.set(1,1,1)
      bone.quaternion.multiply(data.scene.children[0].children[0].quaternion)
      bone.position.set(bone.position.x,bone.position.z,bone.position.y)
    }
    mesh.scale.set(1,1,1)
    parentRotation = data.scene.children[0].children[0].quaternion.clone()
    parentPosition = armatures[0].position.clone()
    boneLengthScale = 100
  }

  if (mesh == null) {
    mesh = new THREE.Mesh()
    skeleton = null
    armatures = null
    let originalHeight = 0

    return { mesh, skeleton, armatures, originalHeight, boneLengthScale, parentRotation, parentPosition }
  }

  skeleton = mesh.skeleton

  if (mesh.material.map) {
    material.map = mesh.material.map
    material.map.needsUpdate = true
  }

  mesh.material = material
  mesh.renderOrder = 1.0

  let bbox = new THREE.Box3().setFromObject(mesh)
  let originalHeight = bbox.max.y - bbox.min.y

  return { mesh, skeleton, armatures, originalHeight, boneLengthScale, parentRotation, parentPosition }
}

const remap = (x, a, b, c, d) => (x - a) * (d - c) / (b - a) + c
const adjusted = value => remap(value, -16385, 16384, -Math.PI, Math.PI)

const Character = React.memo(({
  scene,
  id,
  type,
  remoteInput,
  isSelected,
  selectedBone,
  camera,
  updateCharacterSkeleton,
  updateObject,
  loaded,  
  devices,
  icon,
  storyboarderFilePath,
  boardUid,

  ...props
}) => {
  // setting loaded = true forces an update to sceneObjects,
  // which is what Editor listens for to attach the BonesHelper
  const setLoaded = loaded => updateObject(id, { loaded })
  const object = useRef(null)

  const [modelData, setModelData] = useState(null)

  const doCleanup = () => {
    if (object.current) {
      console.log(type, id, 'remove')
      scene.remove(object.current.bonesHelper)
      scene.remove(object.current.orthoIcon)
      scene.remove(object.current)
      object.current.bonesHelper = null
      object.current = null
    }
  }

  const load = async (model, props) => {
    console.log('Character load', { storyboarderFilePath, model })

    let filepath = await prepareFilepathForModel({
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

    console.log('loading character from', filepath)
    let data
    try {

      let existing = THREE.Cache.get(filepath)
      data = existing
        // re-parse existing data from the cache
        ? await new Promise((resolve, reject) =>
          gltfLoader.parse(
            existing,
            path.dirname(filepath),
            resolve,
            reject
          ))
        // load fresh data
        : await loadGltf(filepath)

    } catch (err) {
      console.error(err)
      alert('Could not load model file')

      // HACK undefined means an error state
      setLoaded(undefined)
      return
    }

    if (isValidSkinnedMesh(data)) {
      console.log(type, id, 'valid model loaded. cleaning up old one.')
      doCleanup()

      setModelData(data)
      setLoaded(true)
    } else {
      alert('This model doesn’t contain a Skinned Mesh. Please load it as an Object, not a Character.')

      // HACK undefined means an error state
      setLoaded(undefined)
    }
  }

  // if the model has changed
  useEffect(() => {
    setLoaded(false)
    load(props.model, { id, ...props })

    // return function cleanup () { }
  }, [props.model])

  useEffect(() => {
    if (object.current) {
      object.current.orthoIcon.changeFirstText(props.name ? props.name : props.displayName)
    }
  }, [props.displayName, props.name])

  // if the model’s data has changed
  useEffect(() => {
    if (modelData) {
      console.log(type, id, 'add')

      const { mesh, skeleton, armatures, originalHeight, boneLengthScale, parentRotation, parentPosition } = characterFactory(modelData)

      object.current = new THREE.Object3D()
      object.current.userData.id = id
      object.current.userData.type = type
      object.current.userData.originalHeight = originalHeight

      // FIXME get current .models from getState()
      object.current.userData.modelSettings = initialState.models[props.model] || {}
      
      object.current.add(...armatures)
      object.current.add(mesh)
      
      object.current.orthoIcon = new IconSprites( type, props.name?props.name:props.displayName, object.current )
      scene.add(object.current.orthoIcon)
      
      object.current.userData.mesh = mesh
      scene.add(object.current)
      let bonesHelper = new BonesHelper( skeleton.bones[0].parent, object.current, { boneLengthScale } )
      mesh.layers.disable(0)
      mesh.layers.enable(1)
      mesh.layers.disable(2)
      mesh.layers.enable(3)

      bonesHelper.traverse(child => {
        child.layers.disable(0)
        child.layers.enable(1)
        child.layers.enable(2)
      })
      bonesHelper.hit_meshes.forEach(h => {
        h.layers.disable(0)
        h.layers.enable(1)
        h.layers.enable(2)
      })
      bonesHelper.cones.forEach(c => {
        c.layers.disable(0)
        c.layers.enable(1)
        c.layers.disable(2)
      })

      object.current.bonesHelper = bonesHelper
      object.current.userData.skeleton = skeleton
      object.current.userData.boneLengthScale = boneLengthScale
      object.current.userData.parentRotation = parentRotation
      object.current.userData.parentPosition = parentPosition
      scene.add(object.current.bonesHelper)
    }

    return function cleanup () {
      console.log('modelData cleanup')
    }
  }, [modelData])

  useEffect(() => {
    return function cleanup () {
      console.log('component cleanup')
      doCleanup()
      setLoaded(false)
    }
  }, [])

  let isRotating = useRef(false)

  let isControllerRotatingCurrent = useRef(false)

  let startingObjectQuaternion = useRef(null)
  let startingDeviceOffset = useRef(null)
  let startingObjectOffset = useRef(null)
  let offset = useRef(null)

  let virtual = useRef({
    roll: 0,
    pitch: 0,
    yaw: 0
  })

  let startingDeviceRotation = useRef(null)
  let currentBoneSelected = useRef(null)

  const updateSkeleton = () => {
    let skeleton = object.current.userData.skeleton
    if (props.skeleton) {
      for (let name in props.skeleton) {
        let bone = skeleton.getBoneByName(name)
        if (bone) {
          bone.rotation.x = props.skeleton[name].rotation.x
          bone.rotation.y = props.skeleton[name].rotation.y
          bone.rotation.z = props.skeleton[name].rotation.z
        }
      }
    }
  }

  const getCurrentControllerRotation = (device, virtual) => {

    let virtualPitch = virtual.pitch,
      virtualRoll = virtual.roll,
      virtualYaw = virtual.yaw

    let { accelX, accelY, accelZ, gyroPitch, gyroRoll, gyroYaw } = device.motion
    virtualYaw = virtualYaw + ((0 - virtualYaw)*0.003)
    virtualRoll = virtualRoll + ((adjusted(gyroRoll) - virtualRoll)*0.003)

    if (adjusted(gyroPitch)) {
      virtualPitch = virtualPitch + (((-adjusted(gyroPitch)) - virtualPitch)*0.003)
    }
    if (adjusted(accelY)) {
      virtualYaw += adjusted(accelY)/10.0
    }

    if (adjusted(accelX)) {
      virtualPitch += adjusted(accelX)/10.0
    }

    if (adjusted(accelZ)) {
      virtualRoll += adjusted(accelZ)/10.0
    }

    let q = new THREE.Quaternion()
      .setFromEuler(
        new THREE.Euler(
          virtualPitch,
          virtualYaw,
          virtualRoll
        )
      )

      return {
        quaternion:q,
        virtualPitch,
        virtualRoll,
        virtualYaw
      }
  }

  //
  // updaters
  //
  // FIXME frame delay between redux update and react render here
  //

  useEffect(() => {
    if (object.current) {
      object.current.position.x = props.x
      object.current.position.z = props.y
      object.current.position.y = props.z

      object.current.orthoIcon.position.copy(object.current.position)
    }
  }, [props.model, props.x, props.y, props.z, modelData])

  useEffect(() => {
    if (object.current) {
      if (props.rotation.y || props.rotation.y==0) {
        object.current.rotation.y = props.rotation.y
        object.current.icon.material.rotation = -props.rotation.y
        //object.current.rotation.x = props.rotation.x
        //object.current.rotation.z = props.rotation.z
      } else {
        object.current.rotation.y = props.rotation
        object.current.orthoIcon.icon.material.rotation = props.rotation + Math.PI
      }

    }
  }, [props.model, props.rotation, modelData])

  const resetPose = () => {
    if (!object.current) return

    let skeleton = object.current.userData.skeleton
    skeleton.pose()
    updateSkeleton()
    // fb converter scaled object
    if (object.current.userData.boneLengthScale === 100) {
      if (props.skeleton['Hips']) {
        // we already have correct values, don't multiply the root bone
      } else {
        skeleton.bones[0].quaternion.multiply(object.current.userData.parentRotation)
      }
      skeleton.bones[0].position.copy(object.current.userData.parentPosition)
    }
  }

  useEffect(() => {
    if (!modelData) return
    if (!props.posePresetId) return

    console.log(type, id, 'changed pose preset')
    resetPose()
  }, [props.posePresetId])

  // HACK force reset skeleton pose on Board UUID change
  useEffect(() => {
    if (!modelData) return
    if (!boardUid) return

    console.log(type, id, 'changed boards')
    resetPose()
  }, [boardUid])

  useEffect(() => {
    if (!modelData) return
    if (!object.current) return

    console.log(type, id, 'skeleton')
    updateSkeleton()
  }, [props.model, props.skeleton, modelData])

  useEffect(() => {
    if (object.current) {
      if (object.current.userData.modelSettings.height) {
        let originalHeight = object.current.userData.originalHeight
        let scale = props.height / originalHeight

        object.current.scale.set( scale, scale, scale )
      } else {
        object.current.scale.setScalar( props.height )
      }
      //object.current.bonesHelper.updateMatrixWorld()
    }
  }, [props.model, props.height, props.skeleton, modelData])

  useEffect(() => {
    if (!modelData) return

    if (object.current) {
      // adjust head proportionally
      let skeleton = object.current.userData.skeleton
      let headBone = skeleton.getBoneByName('Head')

      if (headBone && object.current.userData.modelSettings.height) {
        let baseHeadScale = object.current.userData.modelSettings.height / props.height

        //head bone
        headBone.scale.setScalar( baseHeadScale )
        headBone.scale.setScalar( props.headScale )
      }
    }
  }, [props.model, props.headScale, props.skeleton, modelData])

  useEffect(() => {
    if (!modelData) return
    if (!object.current) return
    let mesh = object.current.userData.mesh

    if (!mesh.morphTargetDictionary) return
    if (Object.values(mesh.morphTargetDictionary).length != 3) return

    mesh.morphTargetInfluences[ 0 ] = props.morphTargets.mesomorphic
    mesh.morphTargetInfluences[ 1 ] = props.morphTargets.ectomorphic
    mesh.morphTargetInfluences[ 2 ] = props.morphTargets.endomorphic
  }, [props.model, props.morphTargets, modelData])

  useEffect(() => {
    console.log(type, id, 'isSelected', isSelected)
    if (!modelData) return
    if (!object.current) return

    // handle selection/deselection - add/remove the bone stucture
    if (isSelected)
    {
      for (var cone of object.current.bonesHelper.cones)
        object.current.bonesHelper.add(cone)
    } else {
      for (var cone of object.current.bonesHelper.cones)
        object.current.bonesHelper.remove(cone)
    }

    let mesh = object.current.userData.mesh
    if ( mesh.material.length > 0 ) {
      mesh.material.forEach(material => {
        material.userData.outlineParameters =
          isSelected
            ? {
              thickness: 0.009,
              color: [ 122/256.0, 114/256.0, 233/256.0 ]
            }
           : {
             thickness: 0.009,
             color: [ 0, 0, 0 ],
           }
      })
    } else {
      mesh.material.userData.outlineParameters =
        isSelected
          ? {
            thickness: 0.009,
            color: [ 122/256.0/2, 114/256.0/2, 233/256.0/2 ]
          }
         : {
           thickness: 0.009,
           color: [ 0, 0, 0 ],
         }
    }
  }, [props.model, isSelected, modelData])

  useEffect(() => {
    if (!modelData) return
    if (!object.current) return

    if (selectedBone === undefined) return

    let skeleton = object.current.userData.skeleton
    let realBone = skeleton.bones.find(bone => bone.uuid == selectedBone)

    if (currentBoneSelected.current === realBone) return

    if (selectedBone === null) {
      if (currentBoneSelected.current) {
        currentBoneSelected.current.connectedBone.material.color = new THREE.Color( 0x7a72e9 )
        currentBoneSelected.current = null
      }
      return
    }

    if (currentBoneSelected.current !== null) {
      currentBoneSelected.current.connectedBone.material.color = new THREE.Color( 0x7a72e9 )
    }
    if (realBone === null || realBone === undefined) return
    realBone.connectedBone.material.color = new THREE.Color( 0x242246 )
    currentBoneSelected.current = realBone

  }, [selectedBone, modelData])

  useEffect(() => {
    if (!object.current) return
    if (!isSelected) return
    if ( devices[0] && devices[0].digital.circle ) //if pressed
    {
      // zero out controller rotation and start rotating bone

      let target
      let skeleton = object.current.userData.skeleton
      if (selectedBone) {
        target = skeleton.bones.find(bone => bone.uuid == selectedBone) || object.current
      } else {
        target = object.current
      }

      let deviceQuaternion
      if (!isControllerRotatingCurrent.current)
      {
        //new rotation
        isControllerRotatingCurrent.current = true
        let startValues = getCurrentControllerRotation(devices[0], virtual.current)
        startingDeviceRotation.current = startValues.quaternion

        startingDeviceOffset.current =  new THREE.Quaternion().clone().inverse().multiply(startingDeviceRotation.current).normalize().inverse()
        startingObjectQuaternion.current = target.quaternion.clone()
        startingObjectOffset.current =  new THREE.Quaternion().clone().inverse().multiply(startingObjectQuaternion.current)
        //console.log('starting rotation: ', startingDeviceRotation.current)
      }
      let midddleValues = getCurrentControllerRotation(devices[0], virtual.current)
      deviceQuaternion = midddleValues.quaternion
      virtual.current = {
        roll: midddleValues.virtualRoll,
        pitch: midddleValues.virtualPitch,
        yaw: midddleValues.virtualYaw
      }

      let objectQuaternion = applyDeviceQuaternion({
        parent: target.parent,
        startingDeviceOffset: startingDeviceOffset.current,
        startingObjectOffset: startingObjectOffset.current,
        startingObjectQuaternion: startingObjectQuaternion.current,
        deviceQuaternion,
        camera
      })

      // APPLY THE ROTATION TO THE TARGET OBJECT
      target.quaternion.copy(objectQuaternion.normalize())
      let rotation = new THREE.Euler()
      if (selectedBone) {
        rotation.setFromQuaternion( objectQuaternion.normalize(), "YXZ" )
        updateCharacterSkeleton({
          id,
          name: target.name,
          rotation: {
            x: target.rotation.x,
            y: target.rotation.y,
            z: target.rotation.z
          }
        })
      } else {
        rotation.setFromQuaternion( objectQuaternion.normalize(), "YXZ" )
        updateObject(target.userData.id, {
          rotation: target.rotation.y
        })
      }

    } else {
      if (devices[0] && devices[0].digital.circle === false && isControllerRotatingCurrent.current)
      {
        //console.log(' CIRCLE button up ')
        isControllerRotatingCurrent.current = false
        virtual.current = {
          roll: 0,
          pitch: 0,
          yaw: 0
        }
      }

      // do something on button up?
    }
  }, [devices])

  useEffect(() => {
    if (!object.current) return
    if (!isSelected) return

    if (remoteInput.mouseMode || remoteInput.orbitMode) return

    // FIND THE TARGET
    // note that we don't want to mutate anything in the scene directly here
    // (e.g.: we don't want to make any direct changes to `target`)
    // instead we dispatch an event describing how we want the system to update
    let target
    let skeleton = object.current.userData.skeleton
    if (selectedBone) {
      target = skeleton.bones.find(bone => bone.uuid == selectedBone) || object.current
    } else {
      target = object.current
    }

    if (remoteInput.down) {
      if (target) {
        let [ alpha, beta, gamma ] = remoteInput.mag.map(THREE.Math.degToRad)
        let magValues = remoteInput.mag
        let deviceQuaternion
        if (!isRotating.current) {
          // The first time rotation starts, get the starting device rotation and starting target object rotation

          isRotating.current = true
          offset.current = 0-magValues[0]
          deviceQuaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler(beta, alpha + (offset.current*(Math.PI/180)),-gamma, 'YXZ')).multiply(new THREE.Quaternion().setFromAxisAngle( new THREE.Vector3( 1, 0, 0 ), -Math.PI / 2 ))
          startingDeviceOffset.current =  new THREE.Quaternion().clone().inverse().multiply(deviceQuaternion).normalize().inverse()

          startingObjectQuaternion.current = target.quaternion.clone()
          startingObjectOffset.current =  new THREE.Quaternion().clone().inverse().multiply(startingObjectQuaternion.current)
        } else {
          deviceQuaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler(beta, alpha + (offset.current*(Math.PI/180)),-gamma, 'YXZ')).multiply(new THREE.Quaternion().setFromAxisAngle( new THREE.Vector3( 1, 0, 0 ), -Math.PI / 2 ))
        }

        // While rotating, perform the rotations

        // get device's offset

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

        if (selectedBone) {
          rotation.setFromQuaternion( objectQuaternion.normalize() )
          updateCharacterSkeleton({
            id,
            name: target.name,
            rotation: {
              x: rotation.x,
              y: rotation.y,
              z: rotation.z
            }
          })
        } else {
          rotation.setFromQuaternion( objectQuaternion.normalize(), "YXZ" )
          updateObject(target.userData.id, {
            rotation: rotation.y
          })
        }
      }
    } else {
      // not pressed anymore, reset
      isRotating.current = false

      startingDeviceOffset.current = null
      startingObjectQuaternion.current = null
      startingObjectOffset.current = null
    }
  }, [remoteInput])

  useEffect(() => {
    if (!loaded) return

    if (object.current) {
      object.current.visible = props.visible
      object.current.orthoIcon.visible = props.visible
      object.current.bonesHelper.visible = props.visible
      object.current.bonesHelper.hit_meshes.map(hit => hit.visible = props.visible)
    }
  }, [props.visible, loaded])

  // useEffect(() => {
  //   if (modelData) {
  //     console.log(type, id, 'setLoaded:true')
  //     setLoaded(true)
  //   }
  // }, [modelData])

  return null
})

module.exports = Character
