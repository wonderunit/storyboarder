function updateBoneToBone(cloneBone, sourceBone)
{
    cloneBone.position.copy(sourceBone.position);
    cloneBone.quaternion.copy(sourceBone.quaternion);
    cloneBone.scale.copy(sourceBone.scale);
    cloneBone.updateMatrixWorld(true);
    for(let i = 0, n = cloneBone.children.length; i < n; i++)
    {
        updateBoneToBone(cloneBone.children[i], sourceBone.children[i]);
    }
}
module.exports = {updateBoneToBone};
