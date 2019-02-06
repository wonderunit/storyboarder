const THREE = require('three')
window.THREE = window.THREE || THREE

const React = require('react')
const { useRef, useEffect, useState } = React

const path = require('path')

const BonesHelper = require('./BonesHelper')

const { initialState } = require('../shared/reducers/shot-generator')

const ModelLoader = require('../services/model-loader')

const applyDeviceQuaternion = require('./apply-device-quaternion')

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

// FIXME doesn't return the correct value when run from `npm run shot-generator`
// https://github.com/electron-userland/electron-webpack/issues/243
// const { app } = require('electron').remote
// const modelsPath = path.join(app.getAppPath(), 'src', 'data', 'shot-generator', 'dummies', 'gltf')
const modelsPath = path.join(__dirname, '..', '..', '..', 'src', 'data', 'shot-generator', 'dummies', 'gltf')

const pathToCharacterModelFile = (model) =>
  ModelLoader.isCustomModel(model)
    // absolute path to a model on the filesystem
    ? model
    // relative path to a model in the app
    : path.join(modelsPath, `${model}.glb`)

const characterFactory = data => {
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
  let armature

  mesh = data.scene.children.find(child => child instanceof THREE.SkinnedMesh) ||
         data.scene.children[0].children.find(child => child instanceof THREE.SkinnedMesh)

  armature = data.scene.children[0].children.find(child => child instanceof THREE.Bone)

  skeleton = mesh.skeleton

  if (mesh.material.map) {
    material.map = mesh.material.map
    material.map.needsUpdate = true
  }
  mesh.material = material
  mesh.renderOrder = 1.0

  let bbox = new THREE.Box3().setFromObject(mesh)
  let originalHeight = bbox.max.y - bbox.min.y

  skeleton.pose()

  return { mesh, skeleton, armature, originalHeight }
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
      scene.remove(object.current)
      object.current.bonesHelper = null
      object.current = null
      setLoaded(false)
    }
  }

  // if the model has changed
  useEffect(() => {
    console.log(type, id, 'model change', props.model)
    setLoaded(false)
    setModelData(false)

    loadGltf(pathToCharacterModelFile(props.model))
      .then(data => setModelData(data))
      .catch(error => console.error(error))

    return function cleanup () {
      console.log(type, id, 'model change cleanup')
      doCleanup()
    }
  }, [props.model])

  // if the model’s data has changed
  useEffect(() => {
    if (modelData) {
      console.log(type, id, 'add')

      const { mesh, skeleton, armature, originalHeight } = characterFactory(modelData)

      object.current = new THREE.Object3D()
      object.current.userData.id = id
      object.current.userData.type = type
      object.current.userData.originalHeight = originalHeight

      // FIXME get current .models from getState()
      object.current.userData.modelSettings = initialState.models[props.model] || {}

      object.current.add(armature)
      object.current.add(mesh)
      object.current.userData.mesh = mesh

      scene.add(object.current)

      let bonesHelper = new BonesHelper(skeleton.bones[0], object.current)
      object.current.bonesHelper = bonesHelper
      object.current.userData.skeleton = skeleton
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
    //skeleton.pose()
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
    }
  }, [props.model, props.x, props.y, props.z, modelData])

  useEffect(() => {
    if (object.current) {
      if (props.rotation.y || props.rotation.y==0) {
        object.current.rotation.y = props.rotation.y
        //object.current.rotation.x = props.rotation.x
        //object.current.rotation.z = props.rotation.z
      } else {
        object.current.rotation.y = props.rotation
      }
      
    }
  }, [props.model, props.rotation, modelData])

  useEffect(() => {
    if (!modelData) return
    if (!object.current) return

    if (props.posePresetId) {
      console.log(type, id, 'changed pose preset')
      let skeleton = object.current.userData.skeleton
      skeleton.pose()
    }
  }, [props.posePresetId])

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

      let headBone = skeleton.getBoneByName('mixamorigHead')

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

    // handle selection/unselection
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

      if (selectedBone) {
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

    if (remoteInput.mouseMode) return

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
          .setFromQuaternion( objectQuaternion.normalize(), "YXZ" )
                
        if (selectedBone) {
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
      object.current.bonesHelper.visible = props.visible
    }
  }, [props.visible, loaded])

  useEffect(() => {
    if (modelData) {
      console.log(type, id, 'setLoaded:true')
      setLoaded(true)
    }
  }, [modelData])

  return null
})

module.exports = Character
