const Pickable = require("./Pickable");
require("../utils/Object3dExtension");
class XRPickableObjectContainer extends Pickable
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
    }

    getMeshesFromSceneObject()
    {
        this.sceneObject.traverse(sceneMesh => 
        {
            if(sceneMesh.type === "Mesh" || sceneMesh.isMesh)
            {
                this.sceneMeshes.push(sceneMesh);
            }
        });
    }

    initialize(id)
    {
        this.node.type = this.sceneObject.userData.type;
        this.node.pickerId = id;
        this.node.renderOrder = this.sceneObject.renderOrder;
        for(let i = 0, n = this.sceneMeshes.length; i < n; i++)
        {
            id = this.idPool.getAvaibleId();
            let sceneMesh = this.sceneMeshes[i];
            super.initialize(id);
            let pickingMaterial = this.pickingMaterial;
            this.pickingMaterials.push(pickingMaterial);
            pickingMaterial.depthTest = sceneMesh.material.depthTest;
            pickingMaterial.depthWrite = sceneMesh.material.depthWrite;
            pickingMaterial.transparent = sceneMesh.material.transparent;  
            this.pickingMesh = new THREE.Mesh(sceneMesh.geometry, pickingMaterial);
            this.pickingMesh.renderOrder = sceneMesh.renderOrder;
            this.node.add(this.pickingMesh);
            this.pickingMesh.pickerId = id;
            this.pickingMeshes.push(this.pickingMesh);
        }
        //ToDO(): Find a better way to remove deleted objects
        this.needsRemoval = false;
    }

    update()
    {
        if(this.isSceneObjectRemoved())
        {
            this.needsRemoval = true;
            return;
        }
        for(let i = this.sceneMeshes.length - 1; i > -1; i--)
        {
            let sceneMesh = this.sceneMeshes[i];
            let pickingMesh = this.pickingMeshes[i];
            if(!sceneMesh.parent)
            {
                this.node.remove(pickingMesh);
                this.pickingMeshes.splice(i, 1);
                this.pickingMaterials.splice(i, 1);
                this.sceneMeshes.splice(i, 1);
                continue;
            }
            pickingMesh.position.copy(sceneMesh.worldPosition());
            pickingMesh.quaternion.copy(sceneMesh.worldQuaternion());
            pickingMesh.scale.copy(sceneMesh.worldScale());
        }
    }

    isObjectAdded(object)
    {
        if(this.sceneMeshes.find(sceneMesh => sceneMesh.uuid === object.uuid))
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
            if(!this.isObjectAdded(object) && (object.type === "Mesh" || object.isMesh)
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
            this.changedIds = [];
            this.pickingMeshes.push(this.pickingMesh);
            this.sceneMeshes.push(sceneMesh);
            this.pickingMesh.pickerId = id;
            this.listOfChangedObjects[i] = {pickingMesh: this.pickingMesh, sceneMesh: sceneMesh};
        }
    }

    dispose()
    {
        super.dispose();
        for(let i = this.pickingMeshes.length - 1; i > -1; i--)
        {
            let pickingMesh = this.pickingMeshes[i];
            pickingMesh.parent.remove(pickingMesh);
            this.pickingMeshes.splice(i, 1);
            this.pickingMaterials.splice(i, 1);
        }
        this.node.removeAllChildren();
    }
}
module.exports = XRPickableObjectContainer;
