const Pickable = require("./Pickable");
const SkeletonUtils = require("../../IK/utils/SkeletonUtils");
const {updateBoneToBone} = require("../utils/PickableCharacterUtils");
class EditorPickableCharacter extends Pickable
{
    constructor(object)
    {
        super(object);
        this.getMeshFromSceneObject();
    }

    getMeshFromSceneObject()
    {
        this.sceneMesh = this.sceneObject.children.find(child => child.type === "SkinnedMesh");
    }

    initialize(id)
    {
        super.initialize(id);
        this.pickingMaterial.skinning = true;
        this.pickingMaterial.morphNormals = true;
        this.pickingMaterial.morphTargets = true;
        let parent = this.sceneObject;
        let userData = parent.userData;
        parent.userData = [];
        this.node = SkeletonUtils.clone(parent);
        parent.userData = userData;
        this.pickingMesh = this.node.children[1];
        this.pickingMesh.material = this.pickingMaterial;
        //TODO(): Remove when XRGPUPIcker changed
        this.node.pickingContainer = this;
        this.node.type = "character";
    }

    update()
    {
        if(this.isSceneObjectRemoved())
        {
            this.needsRemoval = true;
            return;
        }
        let parent = this.sceneObject;
        this.node.position.copy(parent.worldPosition());
        this.node.quaternion.copy(parent.worldQuaternion());
        this.node.scale.copy(parent.worldScale());
        let clonnedRootBone = this.pickingMesh.skeleton.bones[0];
        let originalRootBone = this.sceneMesh.skeleton.bones[0];
        updateBoneToBone(clonnedRootBone, originalRootBone);
    }

    
}
module.exports = EditorPickableCharacter;
