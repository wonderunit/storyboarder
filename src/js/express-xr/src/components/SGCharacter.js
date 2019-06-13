const { useMemo, useRef, useEffect, useState } = React

const { initialState } = require('../../../shared/reducers/shot-generator')
const BonesHelper = require('./SGBonesHelper')

THREE.Cache.enabled = true

const isValidSkinnedMesh = data => {
  try {
    let mesh =
      data.scene.children.find(child => child instanceof THREE.SkinnedMesh) ||
      data.scene.children[0].children.find(child => child instanceof THREE.SkinnedMesh)
    return mesh != null
  } catch (err) {
    console.error(err)
    return false
  }
}

const cloneGltf = gltf => {
  const clone = {
    animations: gltf.animations,
    scene: gltf.scene.clone(true)
  }

  const skinnedMeshes = {}

  gltf.scene.traverse(node => {
    if (node.isSkinnedMesh) {
      skinnedMeshes[node.name] = node
    }
  })

  const cloneBones = {}
  const cloneSkinnedMeshes = {}

  clone.scene.traverse(node => {
    if (node.isBone) {
      cloneBones[node.name] = node
    }

    if (node.isSkinnedMesh) {
      cloneSkinnedMeshes[node.name] = node
    }
  })

  for (let name in skinnedMeshes) {
    const skinnedMesh = skinnedMeshes[name]
    const skeleton = skinnedMesh.skeleton
    const cloneSkinnedMesh = cloneSkinnedMeshes[name]

    const orderedCloneBones = []

    for (let i = 0; i < skeleton.bones.length; ++i) {
      const cloneBone = cloneBones[skeleton.bones[i].name]
      orderedCloneBones.push(cloneBone)
    }

    cloneSkinnedMesh.bind(new THREE.Skeleton(orderedCloneBones, skeleton.boneInverses), cloneSkinnedMesh.matrixWorld)
  }

  return clone
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
  mesh =
    data.scene.children.find(child => child instanceof THREE.SkinnedMesh) ||
    data.scene.children[0].children.find(child => child instanceof THREE.SkinnedMesh)

  if (mesh == null) {
    mesh = new THREE.Mesh()
    skeleton = null
    armatures = null
    let originalHeight = 0

    return { mesh, skeleton, armatures, originalHeight, boneLengthScale, parentRotation, parentPosition }
  }

  armatures = data.scene.children[0].children.filter(child => child instanceof THREE.Bone)
  if (armatures.length === 0) {
    // facebook export is different - bone structure is inside another object3D
    armatures = data.scene.children[0].children[0].children.filter(child => child instanceof THREE.Bone)

    if (armatures.length === 0) {
      //specifically adult-female - bone structure is inside the skinned mesh
      armatures = mesh.children[0].children.filter(child => child instanceof THREE.Bone)
    }
    for (var bone of armatures) {
      bone.scale.set(1, 1, 1)
      bone.quaternion.multiply(data.scene.children[0].children[0].quaternion)
      bone.position.set(bone.position.x, bone.position.z, bone.position.y)
    }
    mesh.scale.set(1, 1, 1)
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

const SGCharacter = ({ id, type, isSelected, updateObject, modelData, selectedBone, ...props }) => {
  const [ready, setReady] = useState(false) // ready to load?
  // setting loaded = true forces an update to sceneObjects,
  // which is what Editor listens for to attach the BonesHelper
  const setLoaded = loaded => updateObject(id, { loaded: true })
  const object = useRef(null)

  const originalSkeleton = useRef(null)

  // const doCleanup = () => {
  //   if (object.current) {
  //     console.log(type, id, 'remove')
  //     scene.remove(object.current.bonesHelper)
  //     scene.remove(object.current)
  //     object.current.bonesHelper = null
  //     object.current = null
  //   }
  // }

  // if the model has changed
  useEffect(() => {
    setReady(false)
    setLoaded(false)

    // return function cleanup () { }
  }, [props.model])

  useEffect(() => {
    if (!ready && modelData) {
      if (isValidSkinnedMesh(modelData)) {
        // console.log(type, id, 'got valid mesh')

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
      setLoaded(true)
    }
  }, [ready])

  const {
    skinnedMesh,
    armatures,
    originalHeight,
    mesh,
    skeleton,
    boneLengthScale,
    parentRotation,
    parentPosition
  } = useMemo(() => {
    if (modelData) {
      const { mesh, skeleton, armatures, originalHeight, boneLengthScale, parentRotation, parentPosition } = characterFactory(
        modelData
      )

      // make a clone of the initial skeleton pose, for comparison
      originalSkeleton.current = skeleton.clone()
      originalSkeleton.current.bones = originalSkeleton.current.bones.map(bone => bone.clone())

      return {
        skinnedMesh: mesh,
        armatures,
        originalHeight,
        mesh,
        skeleton,
        boneLengthScale,
        parentRotation,
        parentPosition
      }
    }

    return {}
  }, [modelData])

  const { bonesHelper } = useMemo(() => {
    if (object.current) {
      let bonesHelper = new BonesHelper(skeleton.bones[0].parent, object.current, {
        boneLengthScale,
        cacheKey: props.model
      })

      return {
        bonesHelper
      }
    }

    return {}
  }, [object.current])

  useEffect(() => {
    return function cleanup() {
      console.log('component cleanup')
      // doCleanup()
      setReady(false)
      setLoaded(false)
    }
  }, [])

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

  useEffect(() => {
    if (object.current) {
      object.current.position.x = props.x
      object.current.position.z = props.y
      object.current.position.y = props.z
    }
  }, [props.model, props.x, props.y, props.z, ready])

  useEffect(() => {
    if (object.current) {
      if (props.rotation.y || props.rotation.y == 0) {
        object.current.rotation.y = props.rotation.y
      } else {
        object.current.rotation.y = props.rotation
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

        object.current.scale.set(scale, scale, scale)
      } else {
        object.current.scale.setScalar(props.height)
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
        headBone.scale.setScalar(baseHeadScale)
        headBone.scale.setScalar(props.headScale)
      }
    }
  }, [props.model, props.headScale, props.skeleton, ready])

  useEffect(() => {
    // console.log(type, id, 'isSelected', isSelected)
    if (!ready) return
    if (!object.current) return

    // handle selection/deselection - add/remove the bone stucture
    if (isSelected) {
      for (var cone of object.current.bonesHelper.cones) object.current.bonesHelper.add(cone)
    } else {
      for (var cone of object.current.bonesHelper.cones) object.current.bonesHelper.remove(cone)
    }
  }, [props.model, isSelected, ready])

  useMemo(() => {
    if (!skinnedMesh) return

    if (skinnedMesh.morphTargetDictionary && Object.values(skinnedMesh.morphTargetDictionary).length === 3) {
      skinnedMesh.morphTargetInfluences[0] = props.morphTargets.mesomorphic
      skinnedMesh.morphTargetInfluences[1] = props.morphTargets.ectomorphic
      skinnedMesh.morphTargetInfluences[2] = props.morphTargets.endomorphic
    }
  }, [modelData, props.morphTargets])

  useEffect(() => {
    if (!ready) return
    if (!object.current) return

    // if there was a prior selected bone
    if (currentBoneSelected.current) {
      // reset it
      currentBoneSelected.current.connectedBone.material.color = new THREE.Color(0x7a72e9)
      currentBoneSelected.current = null
    }

    // was a bone selected?
    if (selectedBone) {
      // find the 3D Bone matching the selectedBone uuid
      let bone = object.current.userData.skeleton.bones.find(b => b.uuid == selectedBone)

      if (bone) {
        currentBoneSelected.current = bone
        currentBoneSelected.current.connectedBone.material.color = new THREE.Color(0x242246)
      }
    }
  }, [selectedBone, ready])

  return skinnedMesh ? (
    <group
      userData={{
        id,
        type,
        name: 'character-container',
        forPanel: {
          height: props.height,
          headScale: props.headScale,
          mesomorphic: props.morphTargets.mesomorphic,
          ectomorphic: props.morphTargets.ectomorphic,
          endomorphic: props.morphTargets.endomorphic
        }
      }}
    >
      <group
        ref={object}
        bonesHelper={bonesHelper ? bonesHelper : null}
        userData={{
          id,
          type,
          originalHeight,
          mesh,
          skeleton,
          boneLengthScale,
          parentRotation,
          parentPosition,
          displayName: props.displayName,
          modelSettings: Object.assign({ rotation: props.rotation }, initialState.models[props.model]) || {
            rotation: props.rotation
          }
        }}
      >
        <primitive userData={{ id, type }} object={skinnedMesh} />
        <primitive object={armatures[0]} />
        {props.children}
      </group>

      {bonesHelper && (
        <group>
          <primitive
            userData={{
              character: skinnedMesh
            }}
            object={bonesHelper}
          />
        </group>
      )}
    </group>
  ) : null
}

module.exports = SGCharacter
