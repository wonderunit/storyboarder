const { useMemo, useState, useRef, useEffect } = React

const cloneGltf = require('../lib/clone-gltf')

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

const SGCharacter = ({ id, model, modelData, x, y, z, skeleton, ...props }) => {
  const object = useRef(null)

  const skinnedMesh = useMemo(() => {
    if (modelData) {
      let data = cloneGltf(modelData)

      let source =
        data.scene.children.find(child => child instanceof THREE.SkinnedMesh) ||
        data.scene.children[0].children.find(child => child instanceof THREE.SkinnedMesh)

      let skinnedMesh = source

      let material = materialFactory()
      if (skinnedMesh.material.map) {
        material.map = skinnedMesh.material.map
        material.map.needsUpdate = true
      }
      skinnedMesh.material = material

      skinnedMesh.morphTargetInfluences[0] = props.morphTargets.mesomorphic
      skinnedMesh.morphTargetInfluences[1] = props.morphTargets.ectomorphic
      skinnedMesh.morphTargetInfluences[2] = props.morphTargets.endomorphic

      skinnedMesh.add(skinnedMesh.skeleton.bones[0])
      skinnedMesh.bind(skinnedMesh.skeleton)

      return skinnedMesh
    }
  }, [modelData])

  // const armature = useMemo(
  //   () => {
  //     if (modelData) {
  //       let armature = modelData.scene
  //         .children[0]
  //         .children
  //         .find(child => child instanceof THREE.Object3D)
  //         .children
  //         .find(child => child instanceof THREE.Bone)
  //       return armature.clone()
  //     }
  //   },
  //   [modelData]
  // )

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

  useEffect(() => {
    if (object.current) {
      object.current.userData.skeleton = skinnedMesh.skeleton
    }
  }, [skinnedMesh, object])

  useEffect(() => {
    if (object.current) {
      object.current.position.x = x
      object.current.position.z = y
      object.current.position.y = z
    }
  }, [x, y, z])

  useEffect(() => {
    if (object.current) {
      let bbox = new THREE.Box3().setFromObject(object.current)
      let originalHeight = bbox.max.y - bbox.min.y
      let scale = props.height / originalHeight
      object.current.scale.set(scale, scale, scale)
    }
  }, [props.height])

  return skinnedMesh ? (
    <group
      ref={object}
      userData={{ id, type: props.type, modelSettings: {} }}
      rotation={[ 0, props.rotation, 0 ]}
    >
      <primitive object={skinnedMesh} />
    </group>
  ) : null
}

module.exports = SGCharacter
