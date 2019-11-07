const THREE = require('three')

const cloneSkinnedMesh = (source, rootBone) => {
  let clonedBones = {}
  rootBone.traverse(bone => {
    clonedBones[bone.name] = bone.clone()
  })

  let newSkinnedMesh = source.clone()

  // find matching bones by name
  const bones = []
  for (let i = 0; i < source.skeleton.bones.length; ++i) {
    let boneName = source.skeleton.bones[i].name
    bones.push(clonedBones[boneName])
  }

  newSkinnedMesh.bind(
    new THREE.Skeleton(
      bones,
      source.skeleton.boneInverses
    ),
    newSkinnedMesh.matrixWorld
  )

  return [newSkinnedMesh, clonedBones]
}

module.exports = cloneSkinnedMesh
