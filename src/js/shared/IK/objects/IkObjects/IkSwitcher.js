// IKSwitcher is class which is responsible for connecting 
// ik bones and character bones
// Ik and character works in different coordinate system ik(+z) and character(-z)
class IKSwitcher
{
    constructor(originalObject, clonedObject)
    {
        this.originalObject = originalObject;
        this.clonedObject = clonedObject;
        this.originalObjectMatrix = {};
        this.cloneObjectMatrix = {};
        this.bonesDelta = {};
        this.ikBonesName = [];
        this.ikBonesName.push("RightShoulder");
        this.ikBonesName.push("LeftShoulder");
    }

    //#region Data collection
    // Calculates difference between ik and character matrix
    // which is used to calculate position in different coordinate system
    recalculateDifference()
    {
        let clonedSkin = this.clonedObject.getObjectByProperty("type", "SkinnedMesh");
        let originalSkin = this.originalObject.getObjectByProperty("type", "SkinnedMesh");
        let clonedBones = clonedSkin.skeleton.bones;
        let originalBones = originalSkin.skeleton.bones;
        let originalBone = originalBones[0];
        let cloneBone = clonedBones[0];
        this.originalObjectMatrix[originalBone.name] = originalBone.matrix.clone();
        this.cloneObjectMatrix[cloneBone.name] = cloneBone.matrix.clone();
    }

    // Calculates relative angle between Ik and Character
    // using delta of they angle will help to calculate they value
    calculateRelativeAngle()
    {
        let clonedSkin = this.clonedObject.getObjectByProperty("type", "SkinnedMesh");
        let originalSkin = this.originalObject.getObjectByProperty("type", "SkinnedMesh");
        let clonedBones = clonedSkin.skeleton.bones;
        let originalBones = originalSkin.skeleton.bones;
        for (let i = 0; i < clonedBones.length; i++)
        {
            let cloneBone = clonedBones[i];
            let originalBone = originalBones[i];

            if(!this.ikBonesName.some((boneName) => originalBone.name === boneName))
            {
                continue;
            }
            let cloneToOriginDelta = new THREE.Quaternion();
            cloneToOriginDelta.multiply(cloneBone.worldQuaternion().conjugate());
            cloneToOriginDelta.multiply(originalBone.worldQuaternion());

            let originToCloneDelta = new THREE.Quaternion();
            originToCloneDelta.multiply(originalBone.worldQuaternion().conjugate());
            originToCloneDelta.multiply(cloneBone.worldQuaternion());

            this.bonesDelta[cloneBone.name] = {};
            this.bonesDelta[originalBone.name].cloneQuat = cloneBone.worldQuaternion().clone();
            this.bonesDelta[originalBone.name].originQuat = originalBone.worldQuaternion().clone();
            this.bonesDelta[originalBone.name].cloneToOriginDelta = cloneToOriginDelta;
            this.bonesDelta[originalBone.name].originToCloneDelta = originToCloneDelta;
        }
    }
    //#endregion

    //#region Switching execution
    // Applies changes from Ik bones to Character bones
    applyChangesToOriginal()
    {
        let clonedSkin = this.clonedObject.getObjectByProperty("type", "SkinnedMesh");
        let originalSkin = this.originalObject.getObjectByProperty("type", "SkinnedMesh");
        let clonedBones = clonedSkin.skeleton.bones;
        let originalBones = originalSkin.skeleton.bones;

        for (let i = 0; i < clonedBones.length; i++)
        {
            let cloneBone = clonedBones[i];
            let originalBone = originalBones[i];
            if(!this.ikBonesName.some((boneName) => originalBone.name === boneName))
            {
                continue;
            }
            this.cloneToOriginRotation(cloneBone, originalBone);
        }
        this.recalculateDifference();
    }

    // Applies quaternion of ik bones to character bones applying relative angle
    cloneToOriginRotation(cloneBone, originBone)
    {
        cloneBone.updateMatrixWorld(true);
        let cloneGlobalQuat = cloneBone.worldQuaternion();
        cloneGlobalQuat.multiply(this.bonesDelta[cloneBone.name].cloneToOriginDelta);
        let transformMatrix = new THREE.Matrix4();
        transformMatrix.multiply(originBone.matrix);
        transformMatrix.multiply(originBone.matrixWorld.inverse());
        cloneGlobalQuat.applyMatrix4(transformMatrix);
        originBone.quaternion.copy(cloneGlobalQuat);
        originBone.updateMatrix();
        originBone.updateWorldMatrix(false, true);
    }

    // Applies changes to ik bones
    // Used to reset ik position and rotation when the pose changed
    // or object reinitialized 
    applyToIk()
    {
        let clonedSkin = this.clonedObject.getObjectByProperty("type", "SkinnedMesh");
        let originalSkin = this.originalObject.getObjectByProperty("type", "SkinnedMesh");
        let clonedBones = clonedSkin.skeleton.bones;
        let originalBones = originalSkin.skeleton.bones;
        for (let i = 0; i < clonedBones.length; i++)
        {
            let cloneBone = clonedBones[i];
            let originalBone = originalBones[i];
            if(!this.ikBonesName.some((boneName) => originalBone.name === boneName))
            {
                continue;
            }
            this.originToCloneRotation(cloneBone, originalBone);
            cloneBone.isRotationChanged = originalBone.isRotationChanged;
        }
        this.recalculateDifference();
    }

    // Applies quaternion of character bones to ik bones through applying relative angle
    originToCloneRotation(cloneBone, originBone)
    {
        let originalGlobalQuat = originBone.worldQuaternion();
        originalGlobalQuat.multiply(this.bonesDelta[originBone.name].originToCloneDelta);
        let transformMatrix = new THREE.Matrix4();
        transformMatrix.multiply(cloneBone.matrix);
        transformMatrix.multiply(cloneBone.matrixWorld.inverse());
        originalGlobalQuat.applyMatrix4(transformMatrix);
        cloneBone.quaternion.copy(originalGlobalQuat);
        cloneBone.updateMatrix();
        cloneBone.updateWorldMatrix(true, true);
    }
    //#endregion

    cleanUp() 
    {
        this.originalObject = null;
        this.clonedObject = null;
        this.originalObjectMatrix = {};
        this.cloneObjectMatrix = {};
        this.bonesDelta = {};
    }
}
module.exports = IKSwitcher;