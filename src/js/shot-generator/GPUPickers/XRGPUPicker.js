const GPUPicker = require("./GPUPicker");
const SkeletonUtils = require("../IK/utils/SkeletonUtils");
const Pickable = require("./PickersContainers/Pickable");
const XRGPUPickerFactory = require("./XRGPUPickerFactory");
class XRGPUPicker extends GPUPicker
{
    constructor()
    {
        super();
        this.addedGroupsId = [];
        this.allowedObjectsTypes = [ "object", "character", "bonesHelper" , "virtual-camera", "light" ];
        this.idBonus = 400;
        this.currentGuiController = "";
        this.controllers = [];
        this.gpuPickerFactory = new XRGPUPickerFactory();
    }

    initalizeChildren(intersectObjects)
    {
        super.initalizeChildren(intersectObjects);
        let objects = [];
        let additionalObjects = [];
        for(let i = 0, n = intersectObjects.length; i < n; i++)
        {
            let intesectable = intersectObjects[i];
            if(this.addedGroupsId.some(group => group === intesectable.uuid))
            {
                if(intesectable.userData.type === "object" && !this.isObjectAdded(intesectable.getObjectByProperty("type", "Mesh")))
                {
                   
                }
                else if(intesectable.userData.type === "character" && !this.isObjectAdded(intesectable.getObjectByProperty("type", "SkinnedMesh")))
                {

                }
                else
                {
                    continue;
                }
            }
            this.getAllSceneMeshes(intesectable, objects, additionalObjects);
            this.addedGroupsId.push(intesectable.uuid);
        }
        let selectableKey = Object.keys(this.gpuPickerHelper.selectableObjects);
        let sceneElementsAmount = !selectableKey[selectableKey.length - 1] ? this.idBonus : parseInt(selectableKey[selectableKey.length - 1], 10);
        let objectsAdded = 0;
        for(let i = 0, n = objects.length; i < n; i++)
        {
            let object = objects[i];
            
            const id = sceneElementsAmount + i + objectsAdded + 1;
            if(objects[i] instanceof Pickable)
            {
                object.initialize(id);
                this.pickingScene.add(object.node);
                if(object.isContainer)
                {
                    for(let i = 0, n = object.pickingMeshes.length; i < n; i++)
                    {
                        let pickingMesh = object.pickingMeshes[i];
                        this.gpuPickerHelper.selectableObjects[pickingMesh.pickerId] = { originObject: object.sceneMeshes[i], pickerObject: pickingMesh} ;
                    }
                    objectsAdded += object.pickingMeshes.length;
                }
                else
                {
                    this.gpuPickerHelper.selectableObjects[id] = { originObject: object.sceneMesh, pickerObject: object.node} ;
                }
                continue;
            }
        } 
    }
  
    updateObject()
    {
        super.updateObject();
        for(let i = 0, n = this.pickingScene.children.length; i < n; i++)
        {
            let clonnedObject = this.pickingScene.children[i];
            if(clonnedObject.pickingContainer)
            {
                let pickingContainer = clonnedObject.pickingContainer;
                pickingContainer.update();
                if(pickingContainer.needsRemoval)
                {
                    pickingContainer.dispose();
                    this.pickingScene.remove(clonnedObject);
                    delete this.gpuPickerHelper.selectableObjects[clonnedObject.pickerId];
                    n = this.pickingScene.children.length;
                    i--;
                }
                continue;
            }
        }
    }

    getAllSceneMeshes(sceneMesh, meshes, additionalObjects)
    {
        if(!sceneMesh.userData)
        {
            return;
        }
        if(sceneMesh.userData.type === "object")
        {
            meshes.push(this.gpuPickerFactory.createObject(sceneMesh));
            return;
        }
        if(sceneMesh.userData.type === "character")
        {
            meshes.push(this.gpuPickerFactory.createCharacter(sceneMesh));
            return;
        }
        if(sceneMesh.userData.type === "virtual-camera" || sceneMesh.userData.type === "light")
        {
            meshes.push(this.gpuPickerFactory.createContainer( sceneMesh.children[0]));
            return;
        }
        if(sceneMesh.userData.type === "gui")
        {
            meshes.push(this.gpuPickerFactory.createGUI(sceneMesh));
        }
    }
}
module.exports = XRGPUPicker;
