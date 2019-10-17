/**
 * @author snayss -- https://codercat.tk
 *
 * Helper utility to iterate through a THREE.Bone heirarchy from a model
 * created in an external software and set each bone +Z Forward vector to
 * face the child bone.
 *
 **/

const THREE = require("three");
require("./Object3dExtension");
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
//#region Pole Angle calculation
 
function calculatePoleAngle(rootBone, endBone, poleBone, rootJoint)
{

    // Taking Ik target position
    let ikTargetPose = endBone.worldPosition(); 
    let rootPose = rootBone.worldPosition();
    let target = poleBone.position.clone();
    let middleJointPose = rootBone.children[0].worldPosition();
    // Projecting pole target on to line between ikTarget and rootPose
    let projectedPole = projectPointOnLine(ikTargetPose, rootPose, target);


    // Getting xAxis through PoleTarget and projectPole
    let xAxis = new THREE.Vector3().subVectors(target, projectedPole).normalize();
    // Getting yAxis through IkTargetPose and projectPole
    let yAxis = new THREE.Vector3().subVectors(ikTargetPose, projectedPole).normalize();
    // Getting zAxis through cross vector of y and Y
    let zAxis = new THREE.Vector3().crossVectors(xAxis, yAxis);

    // Setting up projection matrix
    let TBN = new THREE.Matrix4().makeBasis(xAxis, yAxis, zAxis);

    let direction = rootBone.getWorldDirectionTo(rootBone.children[0]);
    let originalDirection = direction.clone();

    let inversedTBN = new THREE.Matrix4().getInverse(TBN);
    let boneDirectionProjected = new THREE.Vector3().copy(direction).applyMatrix4(inversedTBN);
    let projecPoleFlat = new THREE.Vector2(projectedPole.x, projectedPole.z);
    let boneDirectionProjectedFlat = new THREE.Vector2(boneDirectionProjected.x, boneDirectionProjected.z);

    let angly = projecPoleFlat.angle(); 
    let angleToPlane = -angly;

    projecPoleFlat.rotateAround(new THREE.Vector2(0, 0), angleToPlane);
    projectedPole.x = projecPoleFlat.x;
    projectedPole.z = projecPoleFlat.y;

    angly = boneDirectionProjectedFlat.angle(); 
    angleToPlane = -angly;

    boneDirectionProjectedFlat.rotateAround(new THREE.Vector2(0, 0), angleToPlane);
    boneDirectionProjected.x = boneDirectionProjectedFlat.x;
    boneDirectionProjected.z = boneDirectionProjectedFlat.y;


    let anggle = projectedPole.angleTo(boneDirectionProjected);

    let radius = direction.length();
    let boneDirectionXZ = new THREE.Vector2(boneDirectionProjected.x, boneDirectionProjected.z);
    angly = boneDirectionXZ.angle(); 
    angleToPlane = -angly;
    boneDirectionXZ.rotateAround(new THREE.Vector2(0, 0), angleToPlane);
    boneDirectionProjected.x = boneDirectionXZ.x;
    boneDirectionProjected.z = boneDirectionXZ.y;
    boneDirectionProjected = boneDirectionProjected.applyMatrix4(TBN);
    direction.copy(boneDirectionProjected);

    let angle = direction.angleTo(originalDirection);

    return anggle;
}

// Projects point from target onto line between p1 and p2
function projectPointOnLine(p1, p2, target)
{
    let AB = p2.clone().sub(p1);
    let AP = target.clone().sub(p1);
    let dot1 = AP.clone().dot(AB);
    let dot2 = AB.clone().dot(AB);
    let AB2 = AB.clone().multiplyScalar(dot1 / dot2);
    return p1.clone().add(AB2);
}
function normalizeTo180(angle)
{
  angle = fmod(angle + 180, 360);
  if(angle < 0)
  {
      angle += 360;
  }
  return angle - 180;
}
let fmod = function (a,b) { return Number((a - (Math.floor(a / b) * b)).toPrecision(8)); };

//#endregion
 
// Return angle and axis of current quaternion
// Angle in radians
THREE.Object3D.prototype.getWorldDirectionTo = function getWorldDirectionTo(bone) {
    return new THREE.Vector3().subVectors(this.worldPosition(), bone.worldPosition()).normalize();
}

THREE.Object3D.prototype.lengthTo = function lengthTo(bone)
{
    let worldPose = this.worldPosition();
    let boneWorldPose = bone.worldPosition();
    let length = Math.sqrt(Math.pow(boneWorldPose.x - worldPose.x, 2)
                            + Math.pow(boneWorldPose.y - worldPose.y, 2)
                            + Math.pow(boneWorldPose.z - worldPose.z, 2));
    return length;

}
THREE.Quaternion.prototype.toAngleAxis = function toAngleAxis()
{
    let quaternion = this;
    quaternion.normalize();
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
    let object = this;
    object.position.sub(point);
    object.position.applyAxisAngle(axis, theta);
    object.position.add(point);
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

module.exports.setZDirecion = setZDirecion;
module.exports.calculatePoleAngle = calculatePoleAngle;
module.exports.normalizeTo180 = normalizeTo180;
