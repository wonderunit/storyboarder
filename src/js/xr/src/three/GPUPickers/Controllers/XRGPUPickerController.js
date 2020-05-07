const GPUPickerController = require("./GPUPickerController");
const Pickable = require("../PickersObjects/Pickable");
const XRGPUPickerFactory = require("../Factories/XRGPUPickerFactory");
class XRGPUPickerController extends GPUPickerController
{
    constructor()
    {
        super();
        this.gpuPickerFactory = new XRGPUPickerFactory();
    }

    initalizeChildren(intersectObjects, excludingList)
    {
        let objects = [];
        this.pickingScene.removeAllChildren();
        for(let i = 0, n = intersectObjects.length; i < n; i++)
        {
            let intesectable = intersectObjects[i];
            let pickableObjects = this.pickableObjects;
            let pickableObject = pickableObjects[intesectable.uuid];
            if(excludingList.some(obj => obj.uuid === intesectable.uuid))
            {
                continue;
            }
            if(Object.keys(pickableObjects).length !== 0 && pickableObject)
            {
                if(!pickableObject.node.parent) this.pickingScene.add(pickableObject.node);
                this.updatePickableObject(pickableObject, excludingList)
                continue;
            }
            this.getAllSceneMeshes(intesectable, objects, excludingList);
        }
        for(let i = 0, n = objects.length; i < n; i++)
        {
            let object = objects[i];
            const id = this.idPool.getAvaibleId();
            this.intializeObject(object, id);
        } 
    }

    updatePickableObject(pickableObject, excludingList)
    {
        if(pickableObject.isObjectChanged(excludingList))
        {
            pickableObject.applyObjectChanges();
            if(pickableObject.isContainer)
            {
                for(let i = 0, n = pickableObject.listOfChangedObjects.length; i < n; i++)
                {
                    let {pickingMesh, sceneMesh} = pickableObject.listOfChangedObjects[i];
                    this.gpuPickerHelper.selectableObjects[pickingMesh.pickerId] = { originObject: sceneMesh, pickerObject: pickingMesh} ;
                }
            }
            else
            {
                this.gpuPickerHelper.selectableObjects[pickableObject.node.pickerId].originObject = pickableObject.sceneMesh;
            }
        }
    }

    intializeObject(object, id)
    {
            object.initialize(id);
            this.pickingScene.add(object.node);
            this.pickableObjects[object.getUUID()] = object;
            if(object.isContainer)
            {
                for(let i = 0, n = object.pickingMeshes.length; i < n; i++)
                {
                    let pickingMesh = object.pickingMeshes[i];
                    this.gpuPickerHelper.selectableObjects[pickingMesh.pickerId] = { originObject: object.sceneMeshes[i], pickerObject: pickingMesh} ;
                }
            }
            else
            {
                this.gpuPickerHelper.selectableObjects[id] = { originObject: object.sceneMesh, pickerObject: object.node} ;
            }
    }

    updateObjects()
    {
        let keys = Object.keys(this.pickableObjects);
        for(let i = 0, n = keys.length; i < n; i++)
        {
            let pickableObject = this.pickableObjects[keys[i]];
            pickableObject.update();
            if(pickableObject.needsRemoval)
            {
                let pickingObject = pickableObject.node;
                pickableObject.dispose();
                this.pickingScene.remove(pickingObject);
                delete this.pickableObjects[keys[i]];
            }
        }
        keys = Object.keys( this.gpuPickerHelper.selectableObjects);
        for(let i = 0, n = keys.length; i < n; i++)
        {
            let id = keys[i];
            let selectableObject = this.gpuPickerHelper.selectableObjects[id].originObject;
            if(!selectableObject || !selectableObject.parent)
            {
                delete this.gpuPickerHelper.selectableObjects[id];
                this.idPool.returnId(id);
            }
        }
    }

    getAllSceneMeshes(sceneMesh, meshes, excludingList)
    {
        if(!sceneMesh.userData)
        {
            return;
        }
        switch(sceneMesh.userData.type)
        {
            case 'character':
                let characterObject = this.gpuPickerFactory.createCharacter(sceneMesh, excludingList);
                if(characterObject) meshes.push(characterObject);
                break;
            case 'gui':
                meshes.push(this.gpuPickerFactory.createGUI(sceneMesh, this.idPool, excludingList));
                break;
            case 'object':
               // meshes.push(this.gpuPickerFactory.createObject(sceneMesh, excludingList));
               // break;
            case 'virtual-camera':
            case 'light':
            default:
                meshes.push(this.gpuPickerFactory.createContainer(sceneMesh, this.idPool, excludingList));
                break;
        }
    }
}
module.exports = XRGPUPickerController;
