const Pickable = require("./Pickable");
const SkeletonUtils = require("../../../../../shared/IK/utils/SkeletonUtils");
const {updateBoneToBone} = require("../utils/PickableCharacterUtils");
class UniversalPickableCharacter extends Pickable
{
    constructor(object, excludingList)
    {
        super(object);
        this.sceneObject = object.type === "SkinnedMesh" ? object.parent : object;
        this.getMeshFromSceneObject(excludingList);
        this.characterContainer = this.getCharacterContainer();
        this.excludingList = excludingList;
    }

    getMeshFromSceneObject(excludingList)
    {
        this.sceneMesh = this.getSkinnedMesh(this.sceneObject, excludingList);
    }


    getSkinnedMesh(object, excludingList)
    {
        if(object.isSkinnedMesh && !excludingList.some(obj => obj.uuid === object.uuid))
        {
            return object;
        }
        else
        {
            for(let i = 0; i < object.children.length; i++)
            {
                let child = object.children[i];
                let result = this.getSkinnedMesh(child, excludingList)
                if(result)
                {
                    return result;
                }
            }
        }
    }

    getCharacterContainer()
    {
        if(!this.sceneMesh) return null
        if(this.sceneMesh.parent.type === "LOD")
        {
            return this.sceneMesh.parent.parent;
        }
        return this.sceneMesh.parent;
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
        if(!this.characterContainer) {
            this.needsRemoval = true
            return
        }
        let parent = this.characterContainer;

        if (!this.characterContainer) {
            return false
        }
        
        let ikHelper = parent.children.find(child => child.userData.type === "IkHelper");
        if(ikHelper) parent.remove(ikHelper);
        let bonesHelper = parent.children.find(child => child.userData.type === "BonesHelper");
        if(bonesHelper) parent.remove(bonesHelper);
        this.node = SkeletonUtils.clone(parent);
        if(ikHelper) parent.add(ikHelper);
        if(bonesHelper) parent.add(bonesHelper);
        let lod = this.node.getObjectByProperty("type", "LOD");
        if(lod)
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
        if(!this.sceneMesh || !this.sceneMesh.parent || this.isSceneObjectRemoved())
        {
            this.needsRemoval = true;
            return;
        }
        let parent = this.sceneMesh.parent;
        this.node.position.copy(parent.worldPosition());
        this.node.quaternion.copy(parent.worldQuaternion());
        this.node.scale.copy(parent.worldScale());
        updateBoneToBone(this.pickingMesh, this.sceneMesh);
        this.pickingMaterial.morphNormals = this.sceneMesh.material.morphNormals;
        this.pickingMaterial.morphTargets = this.sceneMesh.material.morphTargets;
        if(!this.sceneMesh.morphTargetInfluences) return;
        for( let i = 0; i < this.sceneMesh.morphTargetInfluences.length; i ++)
        {
            this.pickingMesh.morphTargetInfluences[i] = this.sceneMesh.morphTargetInfluences[i];
        }
    }

    isObjectChanged(excludingList)
    {
        this.excludingList = excludingList;
        if(!this.sceneMesh.parent || !this.sceneMesh.parent.parent)
        {
            return true;
        }
        return false;
    }

    applyObjectChanges()
    {
        this.getMeshFromSceneObject(this.excludingList);
        this.characterContainer = this.getCharacterContainer();
        if(!this.characterContainer) {
            this.needsRemoval = true
            return
        }

        let parent = this.characterContainer;
        let node = SkeletonUtils.clone(parent);
        let lod = node.children[0];
        if(lod.type === "LOD")
        {
            node.attach(lod.children[lod.children.length - 1]);
            node.remove(lod);
        }
        this.pickingMesh = this.getSkinnedMesh(node, this.excludingList );
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

    dispose() 
    {
        super.dispose();
        this.pickingMesh.geometry.dispose()
        this.pickingMesh.skeleton.boneTexture.dispose()
    }
}
module.exports = UniversalPickableCharacter;
