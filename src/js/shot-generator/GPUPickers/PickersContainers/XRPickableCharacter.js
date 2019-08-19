const Pickable = require("./Pickable");
const SkeletonUtils = require("../../IK/utils/SkeletonUtils");
const {updateBoneToBone} = require("../utils/PickableCharacterUtils");
class XRPickableCharacter extends Pickable
{
    constructor(object)
    {
        super(object);
        this.sceneObject = object;
        this.characterContainer = object.children.find(child => child.userData.type === "character");
        this.getMeshFromSceneObject();
    }

    getMeshFromSceneObject()
    {
        this.sceneMesh = this.sceneObject.getObjectByProperty("type", "SkinnedMesh");
    }

    //TODO(): Removed get uuid
    getUUID()
    {
        return this.sceneObject.uuid;
    }

    initialize(id)
    {
        super.initialize(id);
        this.pickingMaterial.skinning = true;
        this.pickingMaterial.morphNormals = true;
        this.pickingMaterial.morphTargets = true;
        let parent = this.characterContainer;
        this.node = SkeletonUtils.clone(parent);
        let lod = this.node.children[0];
        if(lod.type === "LOD")
        {
            this.node.attach(lod.children[lod.children.length - 1]);
            this.node.remove(lod);
        }
        this.pickingMesh = this.node.children.find(child => child.type === "SkinnedMesh");
        this.pickingMesh.material = this.pickingMaterial;
        this.node.type = "character";
        this.node.visible = true;
        this.node.pickerId = id;
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
        if(!this.sceneMesh.parent)
        {
            return true;
        }
        return false;
    }

    applyObjectChanges()
    {
        this.characterContainer = this.sceneObject.children.find(child => child.userData.type === "character");
        this.getMeshFromSceneObject();
        let parent = this.characterContainer;
        let node = SkeletonUtils.clone(parent);
        let lod = node.children[0];
        if(lod.type === "LOD")
        {
            node.attach(lod.children[lod.children.length - 1]);
            node.remove(lod);
        }
        this.pickingMesh = node.children.find(child => child.type === "SkinnedMesh");
        this.pickingMesh.material = this.pickingMaterial;
        this.pickingMesh.needsUpdate = true;
        let i = this.node.children.length;
        while(i !== 0)
        {
            this.node.remove(this.node.children[0]);
            this.node.add(node.children[0]);
            i--;
        }   
        this.pickingMesh.visible = true;
    }
}
module.exports = XRPickableCharacter;
