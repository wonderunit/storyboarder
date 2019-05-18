const { useMemo, useRef, useEffect } = React

const cloneGltf = require('../lib/clone-gltf')
const BonesHelper = require('./SGBonesHelper')

const materialFactory = () => new THREE.MeshToonMaterial({
  color: 0xffffff,
  emissive: 0x0,
  specular: 0x0,
  skinning: true,
  shininess: 0,
  flatShading: false,
  morphNormals: true,
  morphTargets: true
})

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

const SGCharacter = ({ id, model, modelData, x, y, z, skeleton, isSelected, ...props }) => {
  const object = useRef(null)
  const originalSkeleton = useRef(null)

  const { skinnedMesh, bonesHelper } = useMemo(() => {
    if (modelData) {
      const { mesh, skeleton, armatures, originalHeight, boneLengthScale, parentRotation, parentPosition } = characterFactory(
        modelData
      )

      let skinnedMesh = mesh
      let material = materialFactory()
      if (skinnedMesh.material.map) {
        material.map = skinnedMesh.material.map
        material.map.needsUpdate = true
      }
      skinnedMesh.material = material

      skinnedMesh.add(skinnedMesh.skeleton.bones[0])
      skinnedMesh.bind(skinnedMesh.skeleton)

      // make a clone of the initial skeleton pose, for comparison
      originalSkeleton.current = skeleton.clone()
      originalSkeleton.current.bones = originalSkeleton.current.bones.map(bone => bone.clone())

      object.current = new THREE.Object3D()
      object.current.add(skinnedMesh.skeleton.bones[0].clone())
      object.current.add(skinnedMesh)

      let bonesHelper = new BonesHelper(skeleton.bones[0].parent, object.current, {
        boneLengthScale,
        cacheKey: model
      })
      object.current.bonesHelper = bonesHelper

      for (var cone of object.current.bonesHelper.cones) object.current.bonesHelper.add(cone)

      return { skinnedMesh, bonesHelper }
    }
    return { skinnedMesh: undefined, bonesHelper: undefined }
  }, [modelData])

  useMemo(() => {
    if (!skinnedMesh) return

    if (skinnedMesh.morphTargetDictionary && Object.values(skinnedMesh.morphTargetDictionary).length === 3) {
      skinnedMesh.morphTargetInfluences[0] = props.morphTargets.mesomorphic
      skinnedMesh.morphTargetInfluences[1] = props.morphTargets.ectomorphic
      skinnedMesh.morphTargetInfluences[2] = props.morphTargets.endomorphic
    }
  }, [modelData, props.morphTargets])

  useMemo(() => {
    if (!skinnedMesh) return
    if (!Object.keys(skeleton).length) return

    for (let name in skeleton) {
      let bone = skinnedMesh.skeleton.getBoneByName(name)
      if (bone) {
        bone.rotation.x = skeleton[name].rotation.x
        bone.rotation.y = skeleton[name].rotation.y
        bone.rotation.z = skeleton[name].rotation.z

        if (name === 'Hips') {
          bone.rotation.x += Math.PI / 2.0
        }
      }
    }
  }, [skinnedMesh, skeleton])

  const scale = useMemo(() => {
    if (!skinnedMesh) return 1

    let bbox = new THREE.Box3().setFromObject(skinnedMesh)
    let originalHeight = bbox.max.y - bbox.min.y

    return props.height / originalHeight
  }, [skinnedMesh, props.height])

  useMemo(() => {
    if (!skinnedMesh) return
  
    let headBone = skinnedMesh.skeleton.getBoneByName('Head')

    if (headBone) {
      headBone.scale.setScalar( props.headScale )
      // TODO scale proportionally to model height?
    }
  }, [model, props.headScale])

  return skinnedMesh ? (
    <group userData={{ type: props.type }}>
      <group
        ref={object}
        visible={props.visible}
        userData={{
          id,
          displayName: props.displayName,
          type: props.type,
          modelSettings: { rotation: props.rotation },
          forPanel: {
            height: props.height,
            headScale: props.headScale,
            mesomorphic: props.morphTargets.mesomorphic,
            ectomorphic: props.morphTargets.ectomorphic,
            endomorphic: props.morphTargets.endomorphic
          }
        }}
        position={[x, z, y]}
        rotation={[0, props.rotation, 0]}
        scale={[scale, scale, scale]}
      >
        <primitive userData={{ id }} object={skinnedMesh} />
      </group>
      <group>
        <primitive visible={isSelected} object={bonesHelper} />
      </group>
    </group>
  ) : null
}

module.exports = SGCharacter
