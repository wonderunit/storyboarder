const THREE = require('three')
window.THREE = window.THREE || THREE

const React = require('react')
const { useRef, useEffect, useState } = React

const path = require('path')
const debounce = require('lodash.debounce')

const BoundingBoxHelper = require('./BoundingBoxHelper')
const BonesHelper = require('./BonesHelper')

const { initialState } = require('../shared/reducers/shot-generator')

const ModelLoader = require('../services/model-loader')

// character needs:
//   mesh - SkinnedMesh
//   bone structure - ideally Mixamo standard bones
//

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

const remap = (x, a, b, c, d) => (x - a) * (d - c) / (b - a) + c
const adjusted = value => remap(value, -16385, 16384, -Math.PI, Math.PI)

const Character = React.memo(({ scene, id, type, remoteInput, isSelected, selectedBone, camera, updateCharacterSkeleton, updateObject, loaded, devices, ...props }) => {
  const setLoaded = loaded => updateObject(id, { loaded })

  let object = useRef(null)
  let isRotating = useRef(false)
  let isControllerRotatingCurrent = useRef(false)

  let startingObjectQuaternion = useRef(null)
  let startingDeviceOffset = useRef(null)
  let startingObjectOffset = useRef(null)

  let virtual = useRef({
    roll: 0,
    pitch: 0,
    yaw: 0
  })
   
  let circlePressed = useRef(false)

  let startingDeviceRotation = useRef(null)
  let startingObjectRotation = useRef(null)
  let startingGlobalRotation = useRef(null)

  let currentBoneSelected = useRef(null)
  const cloneAnimated = ( source ) => {

    var cloneLookup = new Map()
    var clone = source.clone()

    parallelTraverse( source, clone, function ( sourceNode, clonedNode ) {
      cloneLookup.set( sourceNode, clonedNode )
    } )

    source.traverse( function ( sourceMesh ) {
      if ( ! sourceMesh.isSkinnedMesh ) return
      var sourceBones = sourceMesh.skeleton.bones
      var clonedMesh = cloneLookup.get( sourceMesh )
      clonedMesh.skeleton = sourceMesh.skeleton.clone()
      clonedMesh.skeleton.bones = sourceBones.map( function ( sourceBone ) {
        if ( ! cloneLookup.has( sourceBone ) ) {
          throw new Error( 'THREE.AnimationUtils: Required bones are not descendants of the given object.' )
        }
        return cloneLookup.get( sourceBone )
      } )
      clonedMesh.bind( clonedMesh.skeleton, sourceMesh.bindMatrix )
    } )

    return clone
  }

  const parallelTraverse = ( a, b, callback ) => {
    callback( a, b )
    for ( var i = 0; i < a.children.length; i ++ ) {
      parallelTraverse( a.children[ i ], b.children[ i ], callback )
    }
  }

  const updateSkeleton = () => {
    let skel = (object.current.children[0] instanceof THREE.Mesh) ? object.current.children[0] : object.current.children[1]
    //skel.skeleton.pose()
    if (props.skeleton) {
      for (let name in props.skeleton) {
        let bone = skel.skeleton.getBoneByName(name)
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

  const load = filepath => {
    return new Promise((resolve, reject) => {
      gltfLoader.load(
        filepath,
        data => {
          resolve(data)
        },
        null,
        error => {
          reject(error)
        }
      )
    })
  }

  useEffect(() => {
    console.log(type, id, 'add')

    setLoaded(false)

    let filepath
    if (ModelLoader.isCustomModel(props.model)) {
      filepath = props.model
      console.log('loading a custom character model from the file system', filepath)
    } else {

      // FIXME doesn't return the correct value when run from `npm run shot-generator`
      // https://github.com/electron-userland/electron-webpack/issues/243
      // const { app } = require('electron').remote
      // filepath = path.join(app.getAppPath(), 'src', 'data', 'shot-generator', 'objects', model + '.obj')

      filepath = path.join(
        __dirname, '..', '..', '..', 'src', 'data', 'shot-generator', 'dummies', 'gltf',
        `${props.model}.glb`
      )
      console.log('loading a built-in character model from the app', filepath)
    }

    load(filepath).then(data => {
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
      let mesh = null
      let armature = null
      let obj = new THREE.Object3D()
      obj = data.scene.children[0]

      // first type of GLTF structure, where Skinned Mesh and the bone structure are inside the object3D
      for (var i in data.scene.children[0].children) {
        let child = data.scene.children[0].children[i]
        if ( child instanceof THREE.Mesh ) {
          mesh = child.clone()
        } else {
          if (child instanceof THREE.Object3D && armature === null) armature = child //new THREE.Skeleton(child)
        }
      }

      if (mesh === null)
      {
        //try loading second type of GLTF structure, mesh is outside the Object3D that contains the armature
        for (var i in data.scene.children)
        {
          let child = data.scene.children[i]
          if ( child instanceof THREE.Mesh ) {
            mesh = child
            obj.add(mesh)
          }
        }
      }
      material.map = mesh.material.map//.clone()
      // material.map.image = textureBody.image
      material.map.needsUpdate = true
      let bbox = new THREE.Box3().setFromObject(mesh)

      let height = bbox.max.y - bbox.min.y
      obj.originalHeight = height
      mesh.material = material
      //mesh.rotation.set(0, Math.PI/2, 0)

      // FIXME use actual getState()
      let targetHeight = initialState.models[props.model]
        ? initialState.models[props.model].height
        : 1.6

      let scale = targetHeight / height
      obj.scale.set(scale, scale, scale)
      //mesh.geometry.translate(0, targetHeight/2, 0)
      mesh.renderOrder = 1.0
      mesh.original = data

      source = obj

      let cloned = cloneAnimated(source)

      if (cloned instanceof THREE.SkinnedMesh)  // if FBX is loaded we get a SkinnedMesh
      {
        let clo = cloneAnimated(source)
        cloned = new THREE.Object3D()
        cloned.add(clo)
      }
      let mat = cloned.children[0].material ? cloned.children[0].material.clone() : cloned.children[1].material.clone()

      object.current = cloned
      let skel = (object.current.children[0] instanceof THREE.Mesh) ? object.current.children[0] : object.current.children[1]
      skel.material = mat.clone()
      skel.skeleton.pose()
      object.current.originalHeight = source.originalHeight

      //   MULTI MATERIALS
      // object.current.material = object.current.material.map(material => material.clone())

      object.current.userData.id = id
      object.current.userData.type = type
      object.current.scale.set( source.scale.x, source.scale.y, source.scale.z )
      object.current.rotation.set( source.rotation.x, source.rotation.y, source.rotation.z )
      scene.add( object.current )

      //adding the bone structure here on each character added to the scene
      object.current.bonesHelper = new BonesHelper(skel.skeleton.bones[0], object.current)
      scene.add(object.current.bonesHelper)

      // TODO could avoid the jump by making the entire character a positioned Group with children
      //      OR could run all the updaters here to set position correctly immediately after load?
      //
      // hide until ready
      object.current.visible = false

      setLoaded(true)
    }).catch(err => {
      console.error(err)
    })

    return function cleanup () {
      // TODO cancel loading if in-progress
      console.log(type, id, 'remove')
      if (object.current) {
        scene.remove(object.current.bonesHelper)
        scene.remove(object.current)
        object.current.bonesHelper = null
        object.current = null
      }
    }
  }, [props.model])

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
  }, [props.model, props.x, props.y, props.z, loaded])

  useEffect(() => {
    if (object.current) {
      object.current.visible = props.visible
    }
  }, [props.model, props.visible, loaded])

  useEffect(() => {
    if (object.current) {
      object.current.rotation.y = props.rotation
    }
  }, [props.model, props.rotation, loaded])

  useEffect(() => {
    if (!loaded) return
    if (!object.current) return

    console.log(type, id, 'skeleton')
    updateSkeleton()
  }, [props.model, props.skeleton, loaded])

  useEffect(() => {
    if (object.current) {
      // FIXME hardcoded
      // let bbox = new THREE.Box3().setFromObject( object.current )
      height = object.current.originalHeight
      let scale = props.height / height

      object.current.scale.set( scale, scale, scale )
      //object.current.bonesHelper.updateMatrixWorld()
    }
  }, [props.model, props.height, props.skeleton, loaded])

  useEffect(() => {
    if (!loaded) return

    if (object.current) {
      // adjust head proportionally
      let skel = (object.current.children[0] instanceof THREE.Mesh) ? object.current.children[0] : object.current.children[1]

      let headBone = skel.skeleton.getBoneByName('mixamorigHead')
      // FIXME hardcoded
      let baseHeight = 1.6256
      let baseHeadScale = baseHeight / props.height

      //head bone
      headBone.scale.setScalar( baseHeadScale )
      headBone.scale.setScalar( props.headScale )
    }
  }, [props.model, props.headScale, props.skeleton, loaded])

  useEffect(() => {
    if (!loaded) return
    if (!object.current) return

    // Morphs are changing
    let skel = (object.current.children[0] instanceof THREE.Mesh) ? object.current.children[0] : object.current.children[1]

    //console.log( '\tmorphTargetDictionary', skel.morphTargetDictionary )

    skel.morphTargetInfluences[ 0 ] = props.morphTargets.mesomorphic
    skel.morphTargetInfluences[ 1 ] = props.morphTargets.ectomorphic
    skel.morphTargetInfluences[ 2 ] = props.morphTargets.endomorphic

  }, [props.model, props.morphTargets, loaded])

  useEffect(() => {
    if (!loaded) return
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
    let skel = (object.current.children[0] instanceof THREE.Mesh) ? object.current.children[0] : object.current.children[1]
    if ( skel.material.length > 0 ) {
      skel.material.forEach(material => {
        material.userData.outlineParameters =
          isSelected
            ? {
              thickness: 0.015,
              color: [ 0.9, 0, 0 ]
            }
           : {
             thickness: 0.009,
             color: [ 0, 0, 0 ],
           }
      })
    } else {
      skel.material.userData.outlineParameters =
        isSelected
          ? {
            thickness: 0.015,
            color: [ 0.9, 0, 0 ]
          }
         : {
           thickness: 0.009,
           color: [ 0, 0, 0 ],
         }
    }
  }, [props.model, isSelected, loaded])

  useEffect(() => {
    if (!loaded) return
    if (!object.current) return

    if (selectedBone === undefined) return
    let skel = (object.current.children[0] instanceof THREE.Mesh) ? object.current.children[0] : object.current.children[1]
    let realBone = skel.skeleton.bones.find(bone => bone.uuid == selectedBone)

    if (currentBoneSelected.current === realBone) return

    if (selectedBone === null) {
      if (currentBoneSelected.current) {
        currentBoneSelected.current.connectedBone.material.color = new THREE.Color( 0x006eb8 )
        currentBoneSelected.current = null
      }
      return
    }

    if (currentBoneSelected.current !== null) {
      currentBoneSelected.current.connectedBone.material.color = new THREE.Color( 0x006eb8 )
    }
    if (realBone === null || realBone === undefined) return
    realBone.connectedBone.material.color = new THREE.Color( 0xed0000 )
    currentBoneSelected.current = realBone

  }, [selectedBone, loaded])

  useEffect(() => {
    if (!object.current) return
    if (!isSelected) return
    if ( devices[0] && devices[0].digital.circle ) //if pressed
    {
      // zero out controller rotation and start rotating bone

      let realTarget
      let skel = (object.current.children[0] instanceof THREE.Mesh) ? object.current.children[0] : object.current.children[1]
      if (selectedBone) {
        realTarget = skel.skeleton.bones.find(bone => bone.uuid == selectedBone) || object.current
      } else {
        realTarget = object.current
      }
      let target = realTarget.clone()
      let deviceQuaternion
      if (isControllerRotatingCurrent.current === false)
      {
        isControllerRotatingCurrent.current = true
        let startValues = getCurrentControllerRotation(devices[0], virtual.current)    
        startingDeviceRotation.current = startValues.quaternion
        
        startingDeviceOffset.current =  new THREE.Quaternion().clone().inverse().multiply(startingDeviceRotation.current).normalize().inverse()
        startingObjectQuaternion.current = realTarget.quaternion.clone()
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
      let deviceDifference = new THREE.Quaternion().inverse().multiply(deviceQuaternion).multiply(startingDeviceOffset.current).normalize()
      //console.log('continuous rotation: ', deviceQuaternion)
      // get camera's offset
      let cameraOffset = new THREE.Quaternion().clone().inverse().multiply(camera.quaternion.clone())
      // get parent's offset
      let parentOffset = new THREE.Quaternion().clone().inverse().multiply(realTarget.parent.quaternion.clone())
      realTarget.parent.getWorldQuaternion(parentOffset)

      // START WITH THE INVERSE OF THE STARTING OBJECT ROTATION
      let objectQuaternion = startingObjectQuaternion.current.clone().inverse()

      // ZERO OUT (ORDER IS IMPORTANT)
      // offset
      objectQuaternion.multiply(startingObjectOffset.current)
      // parent's rotation
      objectQuaternion.multiply(parentOffset.inverse())
      // camera
      objectQuaternion.multiply(cameraOffset)

      // APPLY THE DEVICE DIFFERENCE, THIS IS THE MAJOR OPERATION
      objectQuaternion.multiply(deviceDifference)

      // ROTATE THE ZEROS BACK INTO PLACE (REVERSE ORDER)
      // camera
      objectQuaternion.multiply(cameraOffset.inverse())
      // parent's rotation
      objectQuaternion.multiply(parentOffset.inverse())
      // offset
      objectQuaternion.multiply(startingObjectOffset.current)

      // APPLY THE ROTATION TO THE TARGET OBJECT
      //targetobject.quaternion.copy(objectQuaternion.normalize())
      //realTarget.quaternion.copy(objectQuaternion.normalize())
      target.quaternion.copy(objectQuaternion.normalize())
        //target.updateMatrix()
        //console.log('target rotation: ', target.rotation)
        requestAnimationFrame(() => {
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
        })
    } else {
      if (devices[0] && devices[0].digital.circle === false && isControllerRotatingCurrent.current)
      {
        //console.log(' CIRCLE button up ')
        isControllerRotatingCurrent.current = false
      }
      
      // do something on button up?
    }
  }, [devices])

  useEffect(() => {
    if (!object.current) return
    if (!isSelected) return

    if (remoteInput.mouseMode) return

    let realTarget
    let skel = (object.current.children[0] instanceof THREE.Mesh) ? object.current.children[0] : object.current.children[1]
    if (selectedBone) {
      realTarget = skel.skeleton.bones.find(bone => bone.uuid == selectedBone) || object.current
    } else {
      realTarget = object.current
    }

    if (remoteInput.down) {
      if (realTarget) {
        let target = realTarget.clone()
        let [ alpha, beta, gamma ] = remoteInput.mag.map(THREE.Math.degToRad)
        let magValues = remoteInput.mag
        let deviceQuaternion
        if (!isRotating.current)
        {
          // The first time rotation starts, get the starting device rotation and starting target object rotation

          isRotating.current = true
          offset = 0-magValues[0]
          deviceQuaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler(beta, alpha + (offset*(Math.PI/180)),-gamma, 'YXZ')).multiply(new THREE.Quaternion().setFromAxisAngle( new THREE.Vector3( 1, 0, 0 ), -Math.PI / 2 ))
          startingDeviceOffset.current =  new THREE.Quaternion().clone().inverse().multiply(deviceQuaternion).normalize().inverse()

          startingObjectQuaternion.current = realTarget.quaternion.clone()
          startingObjectOffset.current =  new THREE.Quaternion().clone().inverse().multiply(startingObjectQuaternion.current)
        }

        // While rotating, perform the rotations

        // get device's offset
        deviceQuaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler(beta, alpha + (offset*(Math.PI/180)),-gamma, 'YXZ')).multiply(new THREE.Quaternion().setFromAxisAngle( new THREE.Vector3( 1, 0, 0 ), -Math.PI / 2 ))
        let deviceDifference = new THREE.Quaternion().inverse().multiply(deviceQuaternion).multiply(startingDeviceOffset.current).normalize()
        // get camera's offset
        let cameraOffset = new THREE.Quaternion().clone().inverse().multiply(camera.quaternion.clone())
        // get parent's offset
        let parentOffset = new THREE.Quaternion().clone().inverse().multiply(realTarget.parent.quaternion.clone())
        realTarget.parent.getWorldQuaternion(parentOffset)

        // START WITH THE INVERSE OF THE STARTING OBJECT ROTATION
        let objectQuaternion = startingObjectQuaternion.current.clone().inverse()

        // ZERO OUT (ORDER IS IMPORTANT)
        // offset
        objectQuaternion.multiply(startingObjectOffset.current)
        // parent's rotation
        objectQuaternion.multiply(parentOffset.inverse())
        // camera
        objectQuaternion.multiply(cameraOffset)

        // APPLY THE DEVICE DIFFERENCE, THIS IS THE MAJOR OPERATION
        objectQuaternion.multiply(deviceDifference)

        // ROTATE THE ZEROS BACK INTO PLACE (REVERSE ORDER)
        // camera
        objectQuaternion.multiply(cameraOffset.inverse())
        // parent's rotation
        objectQuaternion.multiply(parentOffset.inverse())
        // offset
        objectQuaternion.multiply(startingObjectOffset.current)

        // APPLY THE ROTATION TO THE TARGET OBJECT
        //targetobject.quaternion.copy(objectQuaternion.normalize())
        target.quaternion.copy(objectQuaternion.normalize())
        //target.updateMatrix()
        //console.log('target rotation: ', target.rotation)
        requestAnimationFrame(() => {
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
        })
      }
    } else {
      // not pressed anymore, reset
      isRotating.current = false

      startingDeviceOffset.current = null
      startingObjectQuaternion.current = null
      startingObjectOffset.current = null
    }
  }, [remoteInput])

  // useEffect(() => {
  //   if (!isSelected) return
  //
  //   if (remoteInput.mouseMode) return
  //
  //   let realTarget
  //   let skel = (object.current.children[0] instanceof THREE.Mesh) ? object.current.children[0] : object.current.children[1]
  //   if (selectedBone) {
  //     realTarget = skel.skeleton.bones.find(bone => bone.uuid == selectedBone) || object.current
  //   } else {
  //     realTarget = object.current
  //   }
  //   let target = new THREE.Object3D()
  //   target.rotation.copy(realTarget.rotation)
  //   target.isBone = realTarget.isBone
  //   target.parent = realTarget.parent
  //   target.name = realTarget.name
  //   target.userData = realTarget.userData
  //
  //   if (remoteInput.down) {
  //     if (target) {
  //       let [ alpha, beta, gamma ] = remoteInput.mag.map(THREE.Math.degToRad)
  //
  //       if (!isRotating.current) {
  //         isRotating.current = true
  //         startingObjectRotation.current ={
  //           x: target.rotation.x,
  //           y: target.rotation.y,
  //           z: target.rotation.z
  //         }
  //
  //         startingDeviceRotation.current = {
  //           alpha: alpha,
  //           beta: beta,
  //           gamma: gamma
  //         }
  //
  //         let sgr = new THREE.Quaternion()
  //         realTarget.getWorldQuaternion(sgr)
  //         startingGlobalRotation.current = {
  //           quaternion: sgr
  //         }
  //       }
  //
  //       let startingDeviceQuaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler(startingDeviceRotation.current.beta, startingDeviceRotation.current.alpha, -startingDeviceRotation.current.gamma, 'YXZ')).multiply(new THREE.Quaternion(-Math.sqrt(0.5), 0, 0, Math.sqrt(0.5)))
  //       let tempQ = startingGlobalRotation.current.quaternion.clone()
  //       let cameraQuaternion = camera.quaternion.clone();
  //       let currentMainRotation = object.current.quaternion.clone()
  //       let deviceQuaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler(beta, alpha, -gamma, 'YXZ')).multiply(new THREE.Quaternion(-Math.sqrt(0.5), 0, 0, Math.sqrt(0.5)))
  //       if (target.isBone)
  //       {
  //         // let w = 0.5,
  //         //   x = -0.5,
  //         //   y = -0.5,
  //         //   z = -0.5
  //         let w = 1,
  //             x = 0,
  //             y = 0,
  //             z = 0
  //         startingDeviceQuaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler(startingDeviceRotation.current.beta, startingDeviceRotation.current.alpha, -startingDeviceRotation.current.gamma, 'YXZ')).multiply(new THREE.Quaternion(w, x, y, z))
  //         deviceQuaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler(beta, alpha, -gamma, 'YXZ')).multiply(new THREE.Quaternion(w, x, y, z))
  //       }
  //
  //       //let inversedRotation = new THREE.Quaternion(w, x, y, z)
  //       let parentWorldQuaternion = new THREE.Quaternion()
  //       realTarget.parent.getWorldQuaternion(parentWorldQuaternion).clone()
  //       let startingObjectQuaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler(startingObjectRotation.current.x,startingObjectRotation.current.y,startingObjectRotation.current.z))
  //
  //       startingDeviceQuaternion.multiply(cameraQuaternion.clone())
  //       deviceQuaternion.multiply(cameraQuaternion.clone())
  //
  //       startingDeviceQuaternion.multiply( parentWorldQuaternion.clone() )
  //       deviceQuaternion.multiply( parentWorldQuaternion.clone() )
  //
  //       let deviceDifference = startingDeviceQuaternion.clone().inverse().multiply(deviceQuaternion)
  //
  //       if (target.isBone)
  //       {
  //         t = new THREE.Vector3()
  //         q = new THREE.Quaternion()
  //         s = new THREE.Vector3()
  //         //deviceDifference.multiply ( parentWorldQuaternion.clone() )
  //         tempQ.multiply( deviceDifference )
  //         tempQ.multiply( parentWorldQuaternion.clone())
  //
  //         target.quaternion.copy(tempQ)
  //         target.updateMatrix()
  //       } else {
  //         tempQ.multiply(deviceDifference)
  //         target.quaternion.copy(tempQ)
  //       }
  //
  //       // OLD ROTATION ON AXIS
  //       // let deviceDifference = startingDeviceQuaternion.clone().inverse().multiply(deviceQuaternion)
  //       // startingObjectQuaternion.multiply(deviceDifference)
  //       // target.quaternion.copy(startingObjectQuaternion)
  //
  //       if (selectedBone) {
  //         updateCharacterSkeleton({
  //           id,
  //           name: target.name,
  //           rotation: {
  //             x: target.rotation.x,
  //             y: target.rotation.y,
  //             z: target.rotation.z
  //           }
  //         })
  //       } else {
  //         updateObject(target.userData.id, {
  //           rotation: target.rotation.y
  //         })
  //       }
  //     }
  //   } else {
  //     isRotating.current = false
  //     startingObjectRotation.current = null
  //     startingDeviceRotation.current = null
  //     startingGlobalRotation.current = null
  //
  //   }
  // }, [remoteInput])

  return null
})

module.exports = Character
