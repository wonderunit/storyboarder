/**
 * @author snayss -- https://codercat.tk
 *
 * Helper utility to iterate through a THREE.Bone heirarchy from a model
 * created in an external software and set each bone +Z Forward vector to
 * face the child bone.
 *
 **/

const THREE = require("three");
//const {Quaternion} from "three";

const t = new THREE.Vector3();
const q = new THREE.Quaternion();
const p = new THREE.Plane();
const FORWARD = new THREE.Vector3(0,0,1);
var RESETQUAT = new THREE.Quaternion();
const previousDirection = {};
/**
 * Takes in a rootBone and recursively traverses the bone heirarchy,
 * setting each bone's +Z axis to face it's child bones. The IK system follows this
 * convention, so this step is necessary to update the bindings of a skinned mesh.
 *
 * Must rebind the model to it's skeleton after this function.
 *
 * @param {THREE.BONE} rootBone
 */
// Return angle and axis of current quaternion
// Angle in radians
THREE.Quaternion.prototype.toAngleAxis = function toAngleAxis()
{
    let quaternion = this;
    let angle = 2 * Math.acos(quaternion.w);
    let x = quaternion.x / Math.sqrt(1 - quaternion.w * quaternion.w);
    let y = quaternion.y / Math.sqrt(1 - quaternion.w * quaternion.w);
    let z = quaternion.z / Math.sqrt(1 - quaternion.w * quaternion.w);
    x = isFinite(x) ? x : 0;
    y = isFinite(y) ? y : 0;
    z = isFinite(z) ? z : 0;
    let axis = new THREE.Vector3(x, y, z);
    axis.normalize();
    return {angle: angle, axis: axis};
}

THREE.Object3D.prototype.rotateAroundPoint = function(point, axis, theta)
{
    //isPointInWorld = (isPointInWorld === undefined) ? false : isPointInWorld;
    let object = this;

    object.position.sub(point);
    object.position.applyAxisAngle(axis, theta);
    object.position.add(point);
}

THREE.Vector3.prototype.reverseZ = function reverseZ()
{
    let vector = this;
    return new THREE.Vector3(vector.x, vector.y, -vector.z);
}
THREE.Quaternion.prototype.reverseZ = function reverseZ()
{
    let result = this.toAngleAxis();
    let axis = result.axis.reverseZ();
    return new THREE.Quaternion().setFromAxisAngle(axis, -result.angle);
}
THREE.Matrix4.prototype.reverseZ = function reverseZ()
{
    let matrix = this;
    let position = new THREE.Vector3();
    let rotation = new THREE.Quaternion();
    let scale = new THREE.Vector3();
    matrix.decompose(position, rotation, scale);
    matrix.compose(position.reverseZ(), rotation, scale);
    return matrix;
}

function setReverseZ(rootBone)
{
    var worldPos = {};
    getOriginalWorldPositions(rootBone, worldPos);
    reverseTransform(rootBone, worldPos);
    //let mesh = rootBone.children[1];
    //for(let bone of mesh.skeleton.bones)
    //{
    //    bone.matrix = bone.matrix.reverseZ();
    //}
}

function reverseTransform(parentBone, worldPos)
{
    let quaternion = parentBone.quaternion;
    quaternion = quaternion.reverseZ();
    parentBone.quaternion.copy(RESETQUAT);
    parentBone.updateMatrixWorld();

    parentBone.quaternion.premultiply(quaternion);
    parentBone.updateMatrixWorld();

    //set child bone position relative to the new parent matrix.
    parentBone.children.forEach((childBone) => {
        let childBonePosWorld = worldPos[childBone.id].clone();
        childBonePosWorld = childBonePosWorld.reverseZ();
        parentBone.worldToLocal(childBonePosWorld);
        childBone.position.copy(childBonePosWorld);
    });

    parentBone.children.forEach((childBone) => {
        reverseTransform(childBone, worldPos);
    })
}

function setZDirecion(rootBone, zAxis) {
    var worldPos = {};
    getOriginalWorldPositions(rootBone, worldPos);
    updateTransformations(rootBone, worldPos, zAxis);

}

function updateTransformations(parentBone, worldPos, zAxis) {

    var averagedDir = new THREE.Vector3();
    parentBone.children.forEach((childBone) => {
        //average the child bone world pos
        var childBonePosWorld = worldPos[childBone.id];
        averagedDir.add(childBonePosWorld);
    });

    averagedDir.multiplyScalar(1/(parentBone.children.length));

    //set quaternion
    parentBone.quaternion.copy(RESETQUAT);
    parentBone.updateMatrixWorld();
    //get the child bone position in local coordinates
    var childBoneDir = parentBone.worldToLocal(averagedDir).normalize();
    previousDirection[parentBone.id] = childBoneDir;
    //set the direction to child bone to the forward direction
    var quat = getAlignmentQuaternion(zAxis, childBoneDir);
    if (quat) {
        //rotate parent bone towards child bone
        parentBone.quaternion.premultiply(quat);
        parentBone.updateMatrixWorld();
        //set child bone position relative to the new parent matrix.
        parentBone.children.forEach((childBone) => {
            var childBonePosWorld = worldPos[childBone.id].clone();
            parentBone.worldToLocal(childBonePosWorld);
            childBone.position.copy(childBonePosWorld);
        });
    }

    //parentBone.rotateX();
    parentBone.updateMatrixWorld();
    parentBone.children.forEach((childBone) => {
        updateTransformations(childBone, worldPos, zAxis);
    })
}

function getAlignmentQuaternion(fromDir, toDir) {
    const adjustAxis = t.crossVectors(fromDir, toDir).normalize();
    const adjustAngle = fromDir.angleTo(toDir);
    if (adjustAngle) {
        const adjustQuat = q.setFromAxisAngle(adjustAxis, adjustAngle);
        return adjustQuat;
    }
    return null;
}

function getOriginalWorldPositions(rootBone, worldPos) {
    rootBone.children.forEach((child) => {
        var childWorldPos = child.getWorldPosition(new THREE.Vector3());
        worldPos[child.id] = childWorldPos;
        getOriginalWorldPositions(child, worldPos);
    })
}

function setZBack(rootBone)
{
    var worldPos = {};
    getOriginalWorldPositions(rootBone, worldPos);
    console.log(previousDirection[rootBone.id]);
    let zAxis = previousDirection[rootBone.id].clone();
    updateTransformationsBack(rootBone, worldPos, zAxis);
}

function updateTransformationsBack(parentBone, worldPos, zAxis) {

    var averagedDir = new THREE.Vector3();
    parentBone.children.forEach((childBone) => {
        //average the child bone world pos
        var childBonePosWorld = worldPos[childBone.id];
        averagedDir.add(childBonePosWorld);
    });

    averagedDir.multiplyScalar(1/(parentBone.children.length));

    //set quaternion
    parentBone.quaternion.copy(RESETQUAT);
    parentBone.updateMatrixWorld();
    //get the child bone position in local coordinates
    var childBoneDir = parentBone.worldToLocal(averagedDir).normalize();
    previousDirection[parentBone.id] = childBoneDir;
    //set the direction to child bone to the forward direction
    var quat = getAlignmentQuaternion(zAxis, childBoneDir);
    if (quat) {
        //rotate parent bone towards child bone
        parentBone.quaternion.premultiply(quat);
        parentBone.updateMatrixWorld();
        //set child bone position relative to the new parent matrix.
        parentBone.children.forEach((childBone) => {
            var childBonePosWorld = worldPos[childBone.id].clone();
            parentBone.worldToLocal(childBonePosWorld);
            childBone.position.copy(childBonePosWorld);
        });
    }

    //parentBone.rotateX();
    parentBone.updateMatrixWorld();
    parentBone.children.forEach((childBone) => {
        zAxis = previousDirection[childBone.id].clone();
        updateTransformationsBack(childBone, worldPos, zAxis);
    })
}
module.exports.setZDirecion = setZDirecion;
module.exports.setReverseZ = setReverseZ;
module.exports.setZBack = setZBack;
