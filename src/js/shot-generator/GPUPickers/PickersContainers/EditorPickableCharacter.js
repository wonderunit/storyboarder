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
        this.node = SkeletonUtils.clone(parent);
        this.pickingMesh = this.node.children.find(child => child.type === "SkinnedMesh");
        this.pickingMesh.material = this.pickingMaterial;
        this.node.type = "character";
    }

    update()
    {
        if(this.isSceneObjectRemoved())
        {
            this.needsRemoval = true;
            return;
        }
        console.log(this.sceneObject);
        let parent = this.sceneObject;
        this.node.position.copy(parent.worldPosition());
        this.node.quaternion.copy(parent.worldQuaternion());
        this.node.scale.copy(parent.worldScale());
        let clonnedRootBone = this.pickingMesh.skeleton.bones[0];
        let originalRootBone = this.sceneMesh.skeleton.bones[0];
        updateBoneToBone(clonnedRootBone, originalRootBone);
        clonnedRootBone.updateMatrixWorld(true);
    }

    isObjectChanged()
    {
        if(this.sceneObject && !this.sceneMesh.parent)
        {
            return true;
        }
        return false;
    }

    applyObjectChanges()
    {
        this.sceneMesh = this.sceneObject.children.find(child => child.type === "SkinnedMesh");
        this.pickingMesh.geometry.dispose();
        this.pickingMesh.geometry = this.sceneMesh.geometry;
        this.pickingMesh.name = this.sceneMesh.name;
        this.pickingMesh.needsUpdate = true;
    }
}
module.exports = EditorPickableCharacter;
