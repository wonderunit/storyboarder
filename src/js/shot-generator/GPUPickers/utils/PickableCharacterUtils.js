function updateBoneToBone(cloneBone, sourceBone)
{
    cloneBone.position.copy(sourceBone.position);
    cloneBone.quaternion.copy(sourceBone.quaternion);
    cloneBone.scale.copy(sourceBone.scale);
    for(let i = 0, n = cloneBone.children[i]; i < n; i++)
    {
        this.updateBoneToBone(cloneBone.children[i], oriignalBone.children[i]);
    }
}
module.exports = {updateBoneToBone};
