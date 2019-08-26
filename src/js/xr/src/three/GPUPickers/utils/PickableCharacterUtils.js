function updateBoneToBone(pickingMesh, sourceMesh)
{
    let pickingBones = pickingMesh.skeleton.bones;
    let sourceBones = sourceMesh.skeleton.bones;
    for(let i = 0, n = pickingBones.length; i < n; i++)
    {
        pickingBones[i].position.copy(sourceBones[i].position);
        pickingBones[i].quaternion.copy(sourceBones[i].quaternion);
        pickingBones[i].scale.copy(sourceBones[i].scale);
    }
}
module.exports = {updateBoneToBone};
