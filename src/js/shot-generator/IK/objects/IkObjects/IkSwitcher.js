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

    //#region Data colletion
    // Calculates difference between ik and character matrix
    // which is used to calculate position in different coordinate system
    recalculateDifference()
    {
        let clonedSkin = this.clonedObject.children[1];
        let originalSkin = this.originalObject.children[1];
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
        let clonedSkin = this.clonedObject.children[1];
        let originalSkin = this.originalObject.children[1];
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
        let clonedSkin = this.clonedObject.children[1];
        let originalSkin = this.originalObject.children[1];
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
            if(cloneBone.name === "Hips")
            {
                this.switchBasis(cloneBone, originalBone);
            }
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
        cloneGlobalQuat.applyMatrix(transformMatrix);
        //let originBoneY = originBone.rotation.y;
        originBone.quaternion.copy(cloneGlobalQuat);
        //originBone.rotation.y = originBoneY;
        originBone.updateMatrix();
        originBone.updateWorldMatrix(false, true);
    }

    // Switches basis of Ik bones to Character bones
    // using previous transformation matrix
    switchBasis(cloneBone, originalBone)
    {
        cloneBone.updateMatrix();
        originalBone.updateMatrix();
        cloneBone.updateMatrixWorld(true);
        originalBone.updateMatrixWorld(true);

        let originalCurrentMatrix = originalBone.matrix.clone();
        let clonePrevMatrix = this.cloneObjectMatrix[cloneBone.name].clone();
        let cloneCurrentMatrix = cloneBone.matrix.clone();
        let cloneInversePrevMatrix = new THREE.Matrix4().getInverse(clonePrevMatrix);
        let tMatrixPrevClone = new THREE.Matrix4();

        tMatrixPrevClone.multiply(originalCurrentMatrix);
        tMatrixPrevClone.multiply(cloneInversePrevMatrix);

        clonePrevMatrix.premultiply(tMatrixPrevClone);
        cloneCurrentMatrix.premultiply(tMatrixPrevClone);

        this.setObjectFromMatrixElements(cloneCurrentMatrix, originalBone);
    }

    // Sets object.position to positional matrix
    setObjectFromMatrixElements(matrix, object)
    {
        let position = new THREE.Vector3();
        let rotation = new THREE.Quaternion();
        let scale = new THREE.Vector3();
        matrix.decompose(position, rotation, scale);
        object.position.copy(position);
        object.updateMatrix();
    }

    // Applies changes to ik bones
    // Used to reset ik position and rotation when the pose changed
    // or object reinitialized 
    applyToIk()
    {
        let clonedSkin = this.clonedObject.children[1];
        let originalSkin = this.originalObject.children[1];
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
        }
        clonedBones[0].position.copy(originalBones[0].position);
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
        originalGlobalQuat.applyMatrix(transformMatrix);
        cloneBone.quaternion.copy(originalGlobalQuat);
        cloneBone.updateMatrix();
        cloneBone.updateWorldMatrix(true, true);
    }
    //#endregion
}
module.exports = IKSwitcher;