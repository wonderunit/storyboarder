let raycaster = new THREE.Raycaster()
let objectBox = new THREE.Box3()
let objectCenter = new THREE.Vector3()
let lowerCenter = new THREE.Vector3()
let worldPositionLowestBone = new THREE.Vector3()
let boneWorldPosition = new THREE.Vector3()
raycaster.ray.direction.set(0, -1, 0)

const dropObject = (object, dropToObjects) =>
{
    objectBox.setFromObject(object)
    objectBox.getCenter(objectCenter)
    lowerCenter.set(objectCenter.x, objectBox.min.y, objectCenter.z)
    raycaster.ray.origin.copy(lowerCenter)
    let dropPlace =  raycaster.intersectObjects(dropToObjects, true)[0]
    if(!dropPlace ) return 
    object.parent.worldToLocal(lowerCenter)
    lowerCenter.sub(object.position)
    object.parent.worldToLocal(dropPlace.point)
    object.position.copy(dropPlace.point)
    object.position.sub(lowerCenter)
    object.updateMatrixWorld(true);
}

const dropCharacter = (character, dropToObjects) =>
{
    let skinnedMesh = character
    if(!skinnedMesh.isSkinnedMesh)
    {
        skinnedMesh = skinnedMesh.getObjectByProperty("type", "SkinnedMesh")
    }
    let lowestBone = findLowestBone(skinnedMesh)
    lowestBone.getWorldPosition(worldPositionLowestBone)
    raycaster.ray.origin.copy(worldPositionLowestBone)
    let dropPlace = raycaster.intersectObjects(dropToObjects, true)[0]
    if(!dropPlace ) return 
    
    let lowestBonePosition = lowestBone.worldPosition()
    character.parent.worldToLocal(lowestBonePosition)
    character.parent.worldToLocal(dropPlace.point)
    let offset = new THREE.Vector3().subVectors(character.position, lowestBonePosition)
    let positionDifference = character.worldPosition().clone()
    character.position.copy(dropPlace.point)
    character.position.add(offset)
    positionDifference.sub(character.worldPosition())
    character.updateMatrixWorld(true)
    return positionDifference
}


const findLowestBone = (object) =>
{   
    let lowestBone = null
    let bones = object.skeleton.bones
    for(let i = 0; i < bones.length; i ++)
    {
        let bone = bones[i]
        if(!lowestBone)
        {
            lowestBone = bone
            continue
        }
        bone.getWorldPosition(boneWorldPosition)
        lowestBone.getWorldPosition(worldPositionLowestBone)

        if(boneWorldPosition.y < worldPositionLowestBone.y)
        {
            lowestBone = bone
        }
    }
    return lowestBone
}

module.exports = {dropObject, dropCharacter}
