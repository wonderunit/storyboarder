const Pickable = require("./Pickable");
class XRPickableGUI extends Pickable
{
    constructor(sceneObject, idPool)
    {
        super(sceneObject);
        this.sceneMeshes = [];
        this.pickingMaterials = [];
        this.pickingMeshes = [];
        this.getMeshesFromSceneObject();
        this.isContainer = true;
        this.listOfChangedObjects = [];
        this.idPool = idPool;
        //ToDO(): Find a better way to remove deleted objects
        this.needsRemoval = false;
    }

    getMeshesFromSceneObject()
    {
        this.sceneObject.traverse(object => 
        {
            if(!this.isObjectAdded(object) && object.type === "Mesh" 
            && !object.name.includes("_icon") && !object.name !== ""
            && object.visible)
            {
                this.sceneMeshes.push(object);
            }
        })
    }

    initialize(id)
    {
        this.node.type = this.sceneObject.parent.userData.type;
        this.node.pickerId = id;
        for(let i = 0, n = this.sceneMeshes.length; i < n; i++)
        {
            id = this.idPool.getAvaibleId();
            let sceneMesh = this.sceneMeshes[i];
            super.initialize(id);
            this.pickingMaterial.side = THREE.DoubleSide;
            this.pickingMaterials.push(this.pickingMaterial);
            this.pickingMesh = new THREE.Mesh(sceneMesh.geometry, this.pickingMaterial);
            this.node.add(this.pickingMesh);
            this.pickingMesh.pickerId = id;
            this.pickingMeshes.push(this.pickingMesh);
        }

    }

    update()
    {
        if(this.isSceneObjectRemoved())
        {
            this.needsRemoval = true;
            return;
        }
        for(let i = 0, n = this.sceneMeshes.length; i < n; i++)
        {
            let sceneMesh = this.sceneMeshes[i];
            let pickingMesh = this.pickingMeshes[i];
            if(!sceneMesh)
            {
                this.node.remove(pickingMesh);
                
                delete this.pickingMeshes[i];
                delete this.pickingMaterial[i];
                delete this.sceneMeshes[i];
                n = this.sceneMeshes.length;
                i--;
                continue;
            }
            pickingMesh.position.copy(sceneMesh.worldPosition());
            pickingMesh.quaternion.copy(sceneMesh.worldQuaternion());
            pickingMesh.scale.copy(sceneMesh.worldScale());
        }
    }

    isObjectAdded(object)
    {
        if(this.sceneMeshes.some(sceneMesh => sceneMesh.uuid === object.uuid))
        {
            return true;
        }
        return false;
    }

    isObjectChanged()
    {
        this.listOfChangedObjects = [];
        this.sceneObject.traverse(object => 
        {
            if(!this.isObjectAdded(object) && object.type === "Mesh" 
            && !object.name.includes("_icon") && !object.name !== ""
            && object.visible)
            {
                this.listOfChangedObjects.push(object);
            }
        })
        if(this.listOfChangedObjects.length === 0)
        {
            return false;
        }
        else
        {
            return true;
        }
    }

    applyObjectChanges()
    {
        let id = 0;
        for(let i = 0, n = this.listOfChangedObjects.length; i < n; i++)
        {
            id = this.idPool.getAvaibleId();
            let sceneMesh = this.listOfChangedObjects[i];
            super.initialize(id);
            this.pickingMaterials.push(this.pickingMaterial);
            this.pickingMesh = new THREE.Mesh(sceneMesh.geometry, this.pickingMaterial);
            this.node.add(this.pickingMesh);
            this.pickingMesh.pickerId = id;
            this.pickingMeshes.push(this.pickingMesh);
            this.sceneMeshes.push(sceneMesh);
            this.listOfChangedObjects[i] = {pickingMesh: this.pickingMesh, sceneMesh: sceneMesh};
        }
    }
}
module.exports = XRPickableGUI;
