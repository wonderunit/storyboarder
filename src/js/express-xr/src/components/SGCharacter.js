const { useMemo, useState } = React

const materialFactory = () => new THREE.MeshToonMaterial({
  color: 0xffffff,
  emissive: 0x0,
  specular: 0x0,
  // skinning: true,
  shininess: 0,
  flatShading: false,
  morphNormals: true,
  morphTargets: true
})

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

const SGCharacter = ({ id, model, modelData, x, y, z, skeleton }) => {
  const skinnedMesh = useMemo(
    () => {
      if (modelData) {
        let data = cloneGltf(modelData)

        let source = (
          data.scene.children.find(child => child instanceof THREE.SkinnedMesh) ||
          data.scene.children[0].children.find(child => child instanceof THREE.SkinnedMesh)
        )

        let skinnedMesh = source

        let material = materialFactory()
        if (skinnedMesh.material.map) {
          material.map = skinnedMesh.material.map
          material.map.needsUpdate = true
        }
        skinnedMesh.material = material

        return skinnedMesh
      }
    },
    [modelData]
  )

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
        // console.log(bone.name, { x, y, z } = skeleton[name].rotation)
        bone.rotation.x = skeleton[name].rotation.x
        bone.rotation.y = skeleton[name].rotation.y
        bone.rotation.z = skeleton[name].rotation.z
      }
    }
  }, [skinnedMesh, skeleton])

  return skinnedMesh
    ? <group
      userData={{ id }}
      position={[ x, z, y ]}
      >
        <primitive object={skinnedMesh} />
        {/*
        <primitive object={armature} />
        */}
      </group>
    : null
}

module.exports = SGCharacter
