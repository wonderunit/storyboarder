//#region ragdoll's import
const RagDoll = require("./IK/objects/IkObjects/RagDoll");
const TargetControl = require("./IK/objects/TargetControl");
const RagDollUI = require("./IK/UI/RagDollUI");
//#endregion
const THREE = require('three')
window.THREE = window.THREE || THREE

const React = require('react')
const { useRef, useEffect, useState } = React

const path = require('path')

const BonesHelper = require('./BonesHelper')
const IconSprites = require('./IconSprites')

const { initialState } = require('../shared/reducers/shot-generator')

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

const isValidSkinnedMesh = data => {
  try {
    let mesh = data.scene.children.find(child => child instanceof THREE.SkinnedMesh) ||
              data.scene.children[0].children.find(child => child instanceof THREE.SkinnedMesh)
    return (mesh != null)
  } catch (err) {
    console.error(err)
    return false
  }
}

const cloneGltf = (gltf) => {
  const clone = {
    animations: gltf.animations,
    scene: gltf.scene.clone(true)
  };

  const skinnedMeshes = {};

  gltf.scene.traverse(node => {
    if (node.isSkinnedMesh) {
      skinnedMeshes[node.name] = node;
    }
  });

  const cloneBones = {};
  const cloneSkinnedMeshes = {};

  clone.scene.traverse(node => {
    if (node.isBone) {
      cloneBones[node.name] = node;
    }

    if (node.isSkinnedMesh) {
      cloneSkinnedMeshes[node.name] = node;
    }
  });

  for (let name in skinnedMeshes) {
    const skinnedMesh = skinnedMeshes[name];
    const skeleton = skinnedMesh.skeleton;
    const cloneSkinnedMesh = cloneSkinnedMeshes[name];

    const orderedCloneBones = [];

    for (let i = 0; i < skeleton.bones.length; ++i) {
      const cloneBone = cloneBones[skeleton.bones[i].name];
      orderedCloneBones.push(cloneBone);
    }

    cloneSkinnedMesh.bind(
        new THREE.Skeleton(orderedCloneBones, skeleton.boneInverses),
        cloneSkinnedMesh.matrixWorld);
  }

  return clone;
}

const characterFactory = data => {
  data = cloneGltf(data)

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

  if (mesh == null) {
    mesh = new THREE.Mesh()
    skeleton = null
    armatures = null
    let originalHeight = 0

    return { mesh, skeleton, armatures, originalHeight, boneLengthScale, parentRotation, parentPosition }
  }
  armatures = data.scene.children[0].children.filter(child => child instanceof THREE.Bone)
  if (armatures.length === 0 )
  {  // facebook export is different - bone structure is inside another object3D
    armatures = data.scene.children[0].children[0].children.filter(child => child instanceof THREE.Bone)
    if (armatures.length === 0)
    {  //specifically adult-female - bone structure is inside the skinned mesh
      armatures = mesh.children[0].children.filter(child => child instanceof THREE.Bone)
    }
    for (var bone of armatures)
    {
      console.log(data.scene.children[0].children[0]);
      bone.scale.set(1,1,1)
      bone.quaternion.multiply(data.scene.children[0].children[0].quaternion)
      bone.position.set(bone.position.x, bone.position.z, bone.position.y)
    }
    mesh.scale.set(1,1,1)
    parentRotation = data.scene.children[0].children[0].quaternion.clone()
    parentPosition = armatures[0].position.clone()
    boneLengthScale = 100
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
  devices,
  icon,
  storyboarderFilePath,
  boardUid,

  loaded,
  modelData,
  largeRenderer,
  setSkeleton,
  ...props
}) => {
  const [ready, setReady] = useState(false) // ready to load?
  // setting loaded = true forces an update to sceneObjects,
  // which is what Editor listens for to attach the BonesHelper
  const setLoaded = loaded => updateObject(id, { loaded })
  const object = useRef(null)
  let ragDoll = useRef(null);
  const originalSkeleton = useRef(null)

  const doCleanup = () => {
    if (object.current) {
      console.log(type, id, 'remove')
      if(ragDoll !== null)
      {
        ragDoll.current.removeFromScene(scene);
      }
      scene.remove(object.current.bonesHelper)
      scene.remove(object.current.orthoIcon)
      scene.remove(object.current)
      object.current.bonesHelper = null
      object.current = null
    }
  }

  // if the model has changed
  useEffect(() => {
    setReady(false)
    setLoaded(false)

    // return function cleanup () { }
  }, [props.model])

  useEffect(() => {
    if (object.current) {
      object.current.orthoIcon.changeFirstText(props.name ? props.name : props.displayName)
    }
  }, [props.displayName, props.name])

  // if the model’s data has changed
  useEffect(() => {
    if (ready) {
      console.log(type, id, 'add')




      const { mesh, skeleton, armatures, originalHeight, boneLengthScale, parentRotation, parentPosition } = characterFactory(modelData)

      // make a clone of the initial skeleton pose, for comparison
      originalSkeleton.current = skeleton.clone()
      originalSkeleton.current.bones = originalSkeleton.current.bones.map(bone => bone.clone())


      object.current = new THREE.Object3D()
      object.current.add(...armatures)
      object.current.add(mesh)



      object.current.userData.id = id
      object.current.userData.type = type
      object.current.userData.originalHeight = originalHeight



      // FIXME get current .models from getState()
      object.current.userData.modelSettings = initialState.models[props.model] || {}

      object.current.orthoIcon = new IconSprites( type, props.name?props.name:props.displayName, object.current )
      
      object.current.userData.mesh = mesh

      scene.add(object.current)
      scene.add(object.current.orthoIcon)


      mesh.layers.disable(0)
      mesh.layers.enable(1)
      mesh.layers.disable(2)
      mesh.layers.enable(3)
        //let skinnedMesh = object.current.children[1];
        //skinnedMesh.geometry.rotateZ(Math.PI/2);
        //skinnedMesh.bind(skinnedMesh.skeleton);


      //setSkeleton(skeletonRig);

      let skinnedMesh = object.current.children[1];
      //skeletonRig.changeZToPositive();
      console.log(skinnedMesh.clone());

      let bonesHelper = new BonesHelper( skeleton.bones[0].parent, object.current, { boneLengthScale, cacheKey: props.model } )
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

      console.log(skinnedMesh.clone());
      //
      //object.current.rotateX(-Math.PI/2);
      let rotation = modelData.scene.children[0].children[0].rotation;
      let geometry = skinnedMesh.geometry;
      console.log(rotation);
      //skinnedMesh.geometry.rotateX(rotation.x);
      //skinnedMesh.geometry.rotateY(rotation.y);
      //skinnedMesh.geometry.rotateZ(rotation.z);
      //skinnedMesh.rotation.set(0, 0, 0);
      let array = geometry.attributes.position.array;
      //for (let i = 0; i < array.length / 3; i+=1)
      //{
      //  let temp = array[i*3+1];
      //  array[i*3+1] = array[i*3+2];
      //  array[i*3+2] = -temp;
      //}
      //bonesHelper.quaternion.setFromAxisAngle(new THREE.Vector3(1, 0, 0), -1.5708);

      //skinnedMesh.geometry.rotateX(-Math.PI/2);
      //skinnedMesh.geometry.needsUpdate = true;
      //skinnedMesh.bind(skinnedMesh.skeleton);
      //skinnedMesh.updateMatrixWorld(true);
      console.log(skinnedMesh);
      console.log(bonesHelper);
      //bonesHelper.updateMatrixWorld(true, true);
      for (let i = 0; i < bonesHelper.cones.length; i++)
      {
        let conesGeometry = bonesHelper.cones[i].geometry;
        //conesGeometry.needsUpdate = true;
        // //conesGeometry.rotateX(rotation.x);
        // //conesGeometry.rotateY(rotation.y);
        // //conesGeometry.rotateZ(rotation.z);
      }



      //#endregion

      ragDoll.current = new RagDoll();
      //#region Ragdoll
      let skeletonRig = ragDoll.current;
      let domElement = largeRenderer.current.domElement;
      const hipsControl = AddTransformationControl(new THREE.Vector3(0, 1, 0), camera, domElement, scene, "hips");
      const backControl = AddTransformationControl(new THREE.Vector3(0, 2, -.1), camera, domElement, scene, "back");
      const rightHandControl = AddTransformationControl(new THREE.Vector3(2, 1.5, 0), camera, domElement, scene, "rightHand");
      const leftHandControl = AddTransformationControl(new THREE.Vector3(-2, 1.5, 0), camera, domElement, scene, "leftHand");
      const leftLegControl = AddTransformationControl(new THREE.Vector3(0, 0, 0), camera, domElement, scene, "leftLeg");
      const rightLegControl = AddTransformationControl(new THREE.Vector3(0, 0, 1), camera, domElement, scene, "rightLeg");
      skeletonRig.initObject(scene, object.current, object.current.children[1], backControl, leftHandControl,
          rightHandControl, leftLegControl, rightLegControl,
          hipsControl );


      changeSkeleton(originalSkeleton.current);
      let ragDollUI = new RagDollUI(skeletonRig);
      //skeletonRig.chainObjects[1].controlTarget.control.addEventListener("pointerdown", (event) => isSelected = true);
      console.log(scene);

        object.current.userData.ikUI = ragDollUI;
        object.current.userData.ikRig = skeletonRig;
      //#region Test calculation

     /* let up = new THREE.Vector3(0, 1, 0);
      let arm = new THREE.Vector3(0.5603412019655177, 1.3546231053783038, 2.1512418432692337);
      let foreArm = new THREE.Vector3( 0.5890654774977198, 1.1259133196201865, 2.142118822816933);
      let direction = new THREE.Vector3().subVectors(foreArm, arm).normalize();
      let z = new THREE.Vector3().copy(direction.negate());
      let y = new THREE.Vector3();
      let x = new THREE.Vector3();
      let m = new THREE.Matrix4();
      let target = new THREE.Quaternion();
      x.crossVectors(up, z);
      if (x.lengthSq() == 0) {
        if (Math.abs(up.z) === 1){
          z.x += 0.0001;
        } else {
          z.z += 0.0001;
        }
        z.normalize();
        x.crossVectors(up, z);
      }
      x.normalize();
      y.crossVectors(z, x);
      y.normalize();
      m.makeBasis(x, y, z);
      target.setFromRotationMatrix(m);
      console.log("x:");
      console.log(x);
      console.log("y:");
      console.log(y);
      console.log("z:");
      console.log(z);
      console.log("direction:");
      console.log(direction);
      console.log("target:");
      console.log(target);*/


      //#endregion
    }

    return function cleanup () {
      doCleanup()
      // setLoaded(false)
    }
  }, [ready])

  const changeSkeleton = (skeleton) =>
  {
    let ragdoll = ragDoll.current;
    let ragSkeleton = ragdoll.hips.parent.children[1].skeleton;
    //skeleton = ragSkeleton.clone();
    //skeleton.bones = ragSkeleton.bones.map(bone => bone.clone());
    //ragSkeleton = skeleton;
  }

  useEffect(() => {
    return function cleanup () {
      console.log('component cleanup')
      doCleanup()
      setReady(false)
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

    if (Object.values(props.skeleton).length) {
      for (bone of skeleton.bones) {

        let userState = props.skeleton[bone.name]
        let systemState = originalSkeleton.current.getBoneByName(bone.name).clone()

        let state = userState || systemState

        bone.rotation.x = state.rotation.x
        bone.rotation.y = state.rotation.y
        bone.rotation.z = state.rotation.z
      }
    } else {
      let skeleton = object.current.userData.skeleton
      skeleton.pose()
      fixRootBone()
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
  }, [props.model, props.x, props.y, props.z, ready])

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
  }, [props.model, props.rotation, ready])

  const resetPose = () => {
    if (!object.current) return
    let skeleton = object.current.userData.skeleton
    skeleton.pose()
    updateSkeleton()
    fixRootBone()
  }

  const fixRootBone = () => {
    let { boneLengthScale, parentRotation, parentPosition } = object.current.userData
    let skeleton = object.current.userData.skeleton
    // fb converter scaled object
    if (boneLengthScale === 100) {
      if (props.skeleton['Hips']) {
        // we already have correct values, don't multiply the root bone
      } else {
        skeleton.bones[0].quaternion.multiply(parentRotation)
      }
      skeleton.bones[0].position.copy(parentPosition)
    }
  }

  useEffect(() => {
    if (!ready) return
    if (!props.posePresetId) return
    console.log(type, id, 'changed pose preset')
    resetPose()
  }, [props.posePresetId])

  // HACK force reset skeleton pose on Board UUID change
  useEffect(() => {
    if (!ready) return
    if (!boardUid) return

    console.log(type, id, 'changed boards')
    resetPose()
  }, [boardUid])

  useEffect(() => {
    if (!ready) return
    if (!object.current) return

    // console.log(type, id, 'skeleton')
    updateSkeleton()
  }, [props.model, props.skeleton, ready])

  useEffect(() => {
    if (object.current) {
      if (object.current.userData.modelSettings.height) {
        let originalHeight = object.current.userData.originalHeight
        let scale = props.height / originalHeight
        if(scale !== object.current.scale.x)
        {
          object.current.scale.set(scale, scale, scale)
          object.current.updateMatrixWorld(true);

          ragDoll.current.reinitialize();
        }
      } else {
        console.log("scalar");
        object.current.scale.setScalar( props.height )
      }
      //object.current.bonesHelper.updateMatrixWorld()
    }
  }, [props.model, props.height, props.skeleton, ready])

  useEffect(() => {
    if (!ready) return

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
  }, [props.model, props.headScale, props.skeleton, ready])

  useEffect(() => {
    if (!ready) return
    if (!object.current) return
    let mesh = object.current.userData.mesh

    if (!mesh.morphTargetDictionary) return
    if (Object.values(mesh.morphTargetDictionary).length != 3) return

    mesh.morphTargetInfluences[ 0 ] = props.morphTargets.mesomorphic
    mesh.morphTargetInfluences[ 1 ] = props.morphTargets.ectomorphic
    mesh.morphTargetInfluences[ 2 ] = props.morphTargets.endomorphic
  }, [props.model, props.morphTargets, ready])

  useEffect(() => {
    console.log(type, id, 'isSelected', isSelected)
    if (!ready) return
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
    ragDoll.current.selectedSkeleton(isSelected);

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

    object.current.orthoIcon.setSelected(isSelected)
  }, [props.model, isSelected, ready])

  useEffect(() => {
    if (!ready) return
    if (!object.current) return
    console.log("Selected");
    // if there was a prior selected bone
    if (currentBoneSelected.current) {
      // reset it
      currentBoneSelected.current.connectedBone.material.color = new THREE.Color( 0x7a72e9 )
      currentBoneSelected.current = null
    }

    // was a bone selected?
    if (selectedBone) {
      // find the 3D Bone matching the selectedBone uuid
      let bone = object.current
        .userData
        .skeleton
        .bones.find(b => b.uuid == selectedBone)

      if (bone) {
        currentBoneSelected.current = bone
        currentBoneSelected.current.connectedBone.material.color = new THREE.Color( 0x242246 )
      }
    }
  }, [selectedBone, ready])

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

        startingDeviceOffset.current = new THREE.Quaternion().clone().inverse().multiply(startingDeviceRotation.current).normalize().inverse()
        startingObjectQuaternion.current = target.quaternion.clone()
        startingObjectOffset.current = new THREE.Quaternion().clone().inverse().multiply(startingObjectQuaternion.current)
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
    if (!ready) return

    if (object.current) {
      console.log("selected");
      object.current.visible = props.visible
      object.current.orthoIcon.visible = props.visible
      object.current.bonesHelper.visible = props.visible
      object.current.bonesHelper.hit_meshes.map(hit => hit.visible = props.visible)
    }
  }, [props.visible, ready])

  useEffect(() => {
    if (!ready && modelData) {
      if (isValidSkinnedMesh(modelData)) {
        console.log(type, id, 'got valid mesh')

        setReady(true)
      } else {
        alert('This model doesn’t contain a Skinned Mesh. Please load it as an Object, not a Character.')

        // HACK undefined means an error state
        setLoaded(undefined)
      }
    }
  }, [modelData, ready])

  useEffect(() => {
    if (ready) {
      console.log("ready");
      setLoaded(true)
    }
  }, [ready])

  return null
})
//#region RagDoll
function AddTransformationControl(position, camera, domElement, scene, name)
{
  let targetControl = new TargetControl(camera, domElement, name);
  targetControl.initialize(position, scene);
  return targetControl;
}
//#endregion
module.exports = Character
