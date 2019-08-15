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

    intializeGui(intersectObjects)
    { 
        let updatedGuiUuid = [];
        let guiMesh = {};
        let intesectable = intersectObjects;
        if(intesectable.userData.type === "gui" && !updatedGuiUuid[intesectable.uuid])
        {
            updatedGuiUuid[intesectable.uuid] = true;
            if(intesectable.parent.name !== this.currentGuiController)
            {
                for(let j = 0, m = this.controllers.length; j < m; j++ )
                {
                    this.pickingScene.remove(this.controllers[j]);
                }
                this.controllers = [];
            }
            this.getGuiMeshes(intesectable, guiMesh);
        }
        this.initializeGuiMeshes(guiMesh);
    }

    initalizeChildren(intersectObjects)
    {
        super.initalizeChildren(intersectObjects);
        let objects = [];
        let additionalObjects = [];
        for(let i = 0, n = intersectObjects.length; i < n; i++)
        {
            let intesectable = intersectObjects[i];
            if(intesectable.userData.type === "gui")
            {
                continue;
            }
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
            if(clonnedObject.type === "gui")
            {   
                for(let j = 0, m = clonnedObject.children.length; j < m; j++)
                {
                    let guiElement = clonnedObject.children[j];
                    let originalObject = this.gpuPickerHelper.selectableObjects[guiElement.pickerId].originObject;
                    if(!originalObject)
                    {
                        
                        clonnedObject.remove(guiElement);
                        delete this.gpuPickerHelper.selectableObjects[guiElement.pickerId];
                        m = clonnedObject.children.length;
                        j--;
                        continue;
                    }
                    guiElement.position.copy(originalObject.worldPosition());
                    guiElement.quaternion.copy(originalObject.worldQuaternion());
                    guiElement.scale.copy(originalObject.worldScale());
                    guiElement.updateMatrixWorld(true);
                }
                continue;
            }
        }
    }

    getAllSceneMeshes(sceneMesh, meshes, additionalObjects)
    {
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
    }

    getGuiMeshes(gui, meshes)
    {
        if(gui.userData && gui.userData.type === "gui")
        {
            let controllerName = gui.parent.name;
            meshes[controllerName] = [];
            gui.traverse(object =>
            {
                if(!this.isObjectAdded(object) && object.type === "Mesh" 
                    && !object.name.includes("_icon") && !object.name !== ""
                    && object.visible) 
                {
                    meshes[controllerName].push(object); 
                    return;
                }  
            });
        }
    }

    initializeGuiMeshes(guiMeshes)
    {
        let keys = Object.keys(guiMeshes);
        for(let i = 0, n = keys.length; i < n; i++)
        {
            let selectableKey = Object.keys(this.gpuPickerHelper.selectableObjects);
            let sceneElementsAmount = parseInt(selectableKey[selectableKey.length - 1], 10);
            let node = new THREE.Object3D();
            let key = keys[i];
            node.type = "gui";
            node.name = key;
            let elements = guiMeshes[key];
            this.currentGuiController = key;
            for(let j = 0, m = elements.length; j < m; j++)
            {
                let object = elements[j];
                const id = sceneElementsAmount + j + 1;
                const pickingMaterial = new THREE.MeshPhongMaterial({
                    emissive: new THREE.Color(id),
                    color: new THREE.Color(0, 0, 0),
                    specular: 0x0,
                    skinning: true,
                    shininess: 0,
                    flatShading: false,
                    morphNormals: true,
                    morphTargets: true,
                    side: THREE.DoubleSide
                  });
                let pickingCube = null;
                pickingCube = new THREE.Mesh(object.geometry, pickingMaterial);
                node.add(pickingCube);
                pickingCube.pickerId = id;
                this.gpuPickerHelper.selectableObjects[id] = { originObject: object, pickerObject: pickingCube} ;
            }
            this.pickingScene.add(node);
            this.controllers.push(node);
            //node.pickerId = id;
        }
    }
}
module.exports = XRGPUPicker;
