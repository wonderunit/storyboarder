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
        this.switchingPose = false;
        this.switchingProgress = 1;
        this.switchIterations = 7;
    }

    //#region Data colletion
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

    initializeAxisAngle()
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
                this.basisSwitchinBack(cloneBone, originalBone);
            }
        }
        this.recalculateDifference();
       // this.initializeAxisAngle();
    }

    cloneToOriginRotation(cloneBone, originBone)
    {
        cloneBone.updateMatrixWorld(true);
        let cloneGlobalQuat = cloneBone.worldQuaternion();
        cloneGlobalQuat.multiply(this.bonesDelta[cloneBone.name].cloneToOriginDelta);
        let transformMatrix = new THREE.Matrix4();
        transformMatrix.multiply(originBone.matrix);
        transformMatrix.multiply(originBone.matrixWorld.inverse());
        cloneGlobalQuat.applyMatrix(transformMatrix);
        originBone.quaternion.copy(cloneGlobalQuat);
        originBone.updateMatrix();
        originBone.updateWorldMatrix(false, true);
    }

    basisSwitchinBack(cloneBone, originalBone)
    {
        cloneBone.updateMatrix();
        originalBone.updateMatrix();
        cloneBone.updateMatrixWorld(true);
        originalBone.updateMatrixWorld(true);

        //let originalPrevMatrix = this.originalObjectMatrix[originalBone.name].clone();
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

    setObjectFromMatrixElements(matrix, object)
    {
        let position = new THREE.Vector3();
        let rotation = new THREE.Quaternion();
        let scale = new THREE.Vector3();
        matrix.decompose(position, rotation, scale);
        let euler = new THREE.Euler().setFromQuaternion(rotation);
        object.position.copy(position);
        object.updateMatrix();
    }

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
        
        //console.log("Applied to ik");
    }

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

    //#region Pose switching 
    switchPose()
    {
        this.switchingPose = true;
    
    }

    changingPose()
    {
        if(this.switchingPose)
        {
            this.switchingProgress += 100 / this.switchIterations;
        }
        if( this.switchingProgress >= 100)
        {
            this.switchingPose = false;
            this.switchingProgress = 1;
            //this.initializeAxisAngle();
        }
    }
    //#endregion 
}
module.exports = IKSwitcher;