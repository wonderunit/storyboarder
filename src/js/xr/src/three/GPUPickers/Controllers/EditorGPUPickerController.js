const GPUPickerController = require("./GPUPickerController");
const Pickable = require("../PickersObjects/Pickable");
const EditorGPUPickerFactory = require("../Factories/EditorGPUPickerFactory");
class EditorGPUPickerController extends GPUPickerController
{
    constructor()
    {
        super();
        this.addedGroupsId = [];
        this.gpuPickerFactory = new EditorGPUPickerFactory();
    }

    initalizeChildren(scene)
    {
        let objects = [];
        let intersectObjects = scene.children;
        for(let i = 0, n = intersectObjects.length; i < n; i++)
        {
            let intesectable = intersectObjects[i];
            let pickableObjects = this.pickableObjects;
            let pickableObject = pickableObjects[intesectable.uuid];
            if(Object.keys(pickableObjects).length !== 0 && pickableObject)
            {
                if(pickableObject.isObjectChanged())
                {
                    pickableObject.applyObjectChanges();
                }
                continue;
            }
            if(this.addedGroupsId.some(group => group === intesectable.uuid))
            {
                continue;
            }
            this.getAllSceneMeshes(intesectable, objects);
            this.addedGroupsId.push(intesectable.uuid);
        }

        for(let i = 0, n = objects.length; i < n; i++)
        {
            let object = objects[i];
            const id = this.idPool.getAvaibleId();
            if(objects[i] instanceof Pickable)
            {
                object.initialize(id);
                this.pickingScene.add(object.node);
                this.gpuPickerHelper.selectableObjects[id] = { originObject: object.sceneMesh, pickerObject: object.node} ;
                this.pickableObjects[object.sceneObject.uuid] = object;
            }
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
                delete this.gpuPickerHelper.selectableObjects[pickingObject.pickerId];
            }
        }
        keys = Object.keys( this.gpuPickerHelper.selectableObjects);
        for(let i = 0, n = keys.length; i < n; i++)
        {
            let id = keys[i];
            let selectableObject = this.gpuPickerHelper.selectableObjects[id].originObject;
            if(!selectableObject.parent)
            {
                delete this.gpuPickerHelper.selectableObjects[id];
                this.idPool.returnId(id);
            }
        }
    }

    getAllSceneMeshes(sceneMesh, meshes)
    {
        if(sceneMesh.userData)
        {
            if(sceneMesh.userData.type === "object")
            {
                let pickerObject = this.gpuPickerFactory.createObject(sceneMesh);
                meshes.push(pickerObject);
            }
            else if(sceneMesh.userData.type === "character")
            {
                let pickerObject = this.gpuPickerFactory.createCharacter(sceneMesh);
                meshes.push(pickerObject);
            }
        }
    }
}
module.exports = EditorGPUPickerController;
