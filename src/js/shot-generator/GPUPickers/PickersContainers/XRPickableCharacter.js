const Pickable = require("./Pickable");
const SkeletonUtils = require("../../IK/utils/SkeletonUtils");
const {updateBoneToBone} = require("../utils/PickableCharacterUtils");
class XRPickableCharacter extends Pickable
{
    constructor(object)
    {
        super(object);
        this.sceneObject = object.children.find(child => child.userData.type === "character");
        this.getMeshFromSceneObject();
    }

    getMeshFromSceneObject()
    {
        this.sceneMesh = this.sceneObject.getObjectByProperty("type", "SkinnedMesh");
    }

    initialize(id)
    {
        super.initialize(id);
        this.pickingMaterial.skinning = true;
        this.pickingMaterial.morphNormals = true;
        this.pickingMaterial.morphTargets = true;
        let parent = this.sceneObject;
        this.node = SkeletonUtils.clone(parent);
        let lod = this.node.children[0];
        if(lod.type === "LOD")
        {
            this.node.attach(lod.children[lod.children.length - 1]);
            this.node.remove(lod);
        }
        this.pickingMesh = this.node.children.find(child => child.type === "SkinnedMesh");
        this.pickingMesh.material = this.pickingMaterial;
        //TODO(): Remove when XRGPUPicker changed
        this.node.pickingContainer = this;
        this.node.type = "character";
        this.node.visible = true;
        this.pickingMesh.visible = true;
    }

    update()
    {
        if(this.isSceneObjectRemoved())
        {
            this.needsRemoval = true;
            return;
        }
        let parent = this.sceneMesh.parent;
        console.log(parent);
        console.log(this.node);
        console.log(this.node);
        this.node.position.copy(parent.worldPosition());
        this.node.quaternion.copy(parent.worldQuaternion());
        this.node.scale.copy(parent.worldScale());
        let clonnedRootBone = this.pickingMesh.skeleton.bones[0];
        let originalRootBone = this.sceneMesh.skeleton.bones[0];
        updateBoneToBone(clonnedRootBone, originalRootBone);
        clonnedRootBone.updateMatrixWorld(true);
    }
}
module.exports = XRPickableCharacter;
