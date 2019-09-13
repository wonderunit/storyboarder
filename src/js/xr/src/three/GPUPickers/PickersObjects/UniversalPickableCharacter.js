const Pickable = require("./Pickable");
const SkeletonUtils = require("../../../../../shot-generator/IK/utils/SkeletonUtils");
const {updateBoneToBone} = require("../utils/PickableCharacterUtils");
class UniversalPickableCharacter extends Pickable
{
    constructor(object, excludingList)
    {
        super(object);
        this.sceneObject = object.type === "SkinnedMesh" ? object.parent : object;
<<<<<<< HEAD
        this.getMeshFromSceneObject();
=======
        this.getMeshFromSceneObject(excludingList);
>>>>>>> master
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
        updateBoneToBone(this.pickingMesh, this.sceneMesh);
        if(this.sceneMesh.morphTargetInfluences)
        {
            let mesomorphic = this.sceneMesh.morphTargetInfluences[ 0 ];
            let ectomorphic = this.sceneMesh.morphTargetInfluences[ 1 ];
            let endomorphic = this.sceneMesh.morphTargetInfluences[ 2 ];
            if(mesomorphic) this.pickingMesh.morphTargetInfluences[ 0 ] = mesomorphic;
            if(ectomorphic) this.pickingMesh.morphTargetInfluences[ 1 ] = ectomorphic;
            if(endomorphic) this.pickingMesh.morphTargetInfluences[ 2 ] = endomorphic;
        }
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
        this.getMeshFromSceneObject();
        this.characterContainer = this.getCharacterContainer();
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

    getCharacterContainer()
    {
        if(this.sceneMesh.parent.type === "LOD")
        {
            return this.sceneMesh.parent.parent;
        }
        return this.sceneMesh.parent;
    }


}
module.exports = UniversalPickableCharacter;
