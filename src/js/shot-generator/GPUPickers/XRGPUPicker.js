const GPUPicker = require("./GPUPicker");
const SkeletonUtils = require("../IK/utils/SkeletonUtils");
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
                //console.log("Object's group added", intesectable);
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
                //continue;
            }
            this.getAllSceneMeshes(intesectable, objects, additionalObjects);
            this.addedGroupsId.push(intesectable.uuid);
        }
        let selectableKey = Object.keys(this.gpuPickerHelper.selectableObjects);
        let sceneElementsAmount = !selectableKey[selectableKey.length - 1] ? this.idBonus : parseInt(selectableKey[selectableKey.length - 1], 10);
        for(let i = 0, n = objects.length; i < n; i++)
        {
            let object = objects[i];
            
            const id = sceneElementsAmount + i + 1;
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
            let node = new THREE.Object3D();

            if(object.type === "SkinnedMesh")
            {
                let parent = object.parent;
                if(parent.type === "LOD")
                {
                    parent = parent.parent;
                }
                let userData = parent.userData;
                parent.userData = [];
                node = SkeletonUtils.clone(parent);
                parent.userData = userData;
                let lod = node.children[0];
                if(lod.type === "LOD")
                {
                    //let bones = node.children[1];
                    node.attach(lod.children[0]);
                    node.remove(lod);
                   //console.log(node.children[0].children.find(child => child.type === "SkinnedMesh"));
                   //pickingCube = node.children[0].children.find(child => child.type === "SkinnedMesh");
                }
                pickingCube = node.children.find(child => child.type === "SkinnedMesh");
    

                pickingCube.material = pickingMaterial;
                pickingCube.matrixWorldNeedsUpdate = true;
                pickingCube.visible = true;
                node.type = "character";
                let {cones, selectable} = this.initializeCones(additionalObjects[parent.parent.uuid], object.skeleton.bones);
                node.cones = cones;
                node.selectable = selectable;
            }
            else
            {  
                pickingCube = new THREE.Mesh(object.geometry, pickingMaterial);
                node.type = "object";
                node.add(pickingCube);
            }
            this.pickingScene.add(node);
            node.pickerId = id;
            pickingCube.pickerId = id;
            this.gpuPickerHelper.selectableObjects[id] = { originObject: object, pickerObject: node} ;
        } 
       
    }
  
    updateObject()
    {
        super.updateObject();
        for(let i = 0, n = this.pickingScene.children.length; i < n; i++)
        {
            let clonnedObject = this.pickingScene.children[i];
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
            let originalObject = clonnedObject.type === "object" ? this.gpuPickerHelper.selectableObjects[clonnedObject.pickerId].originObject : this.gpuPickerHelper.selectableObjects[clonnedObject.pickerId].originObject.parent;
            if(!originalObject)
            {
                this.pickingScene.remove(clonnedObject);
                delete this.gpuPickerHelper.selectableObjects[clonnedObject.pickerId];
                n = this.pickingScene.children.length;
                i--;
                continue;
            }
            if(originalObject.userData.type === "character" && originalObject.type !== "LOD")
            {
                originalObject = this.gpuPickerHelper.selectableObjects[clonnedObject.pickerId].originObject;
                //originalObject.rotateX(Math.PI/2);
            }
            clonnedObject.position.copy(originalObject.worldPosition());
            clonnedObject.quaternion.copy(originalObject.worldQuaternion());
            clonnedObject.scale.copy(originalObject.worldScale());
            if(originalObject.type === "SkinnedMesh")
            {
                clonnedObject.rotateX(Math.PI/2);
            }

            clonnedObject.updateMatrixWorld(true);
            if(clonnedObject.type === "character" && this.gpuPickerHelper.selectableObjects[clonnedObject.pickerId].originObject.skeleton)
            {
                let clonnedSkinnedMesh = clonnedObject.children.find(child => child.type === "SkinnedMesh");
                let originalSkinnedMesh = this.gpuPickerHelper.selectableObjects[clonnedObject.pickerId].originObject;
            
                let originalRootBone = originalSkinnedMesh.skeleton.bones[0];
                let clonnedRootBone = clonnedSkinnedMesh.skeleton.bones[0];
           
                this.updateSkeletonBone(clonnedRootBone, originalRootBone);
                clonnedRootBone.updateMatrixWorld(true);
                this.updateCones(clonnedObject.cones);
            }
        }
    }

    getAllSceneMeshes(sceneMesh, meshes, additionalObjects)
    {
        super.getAllSceneMeshes();
        let sceneChildren = sceneMesh.children;
        if(sceneChildren === undefined )
        {
            return;
        }
        
        if(sceneMesh.userData && this.allowedObjectsTypes.some(allowedObjects => allowedObjects === sceneMesh.userData.type))
        {
            if(sceneMesh.userData.type === "virtual-camera" || sceneMesh.userData.type === "light")
            {
                sceneChildren = sceneMesh.children[0].children;
            }
            for(let i = 0, n = sceneChildren.length; i < n; i++)
            {
                let child = sceneChildren[i];
                if(child.type === "Mesh") 
                {
                    meshes.push(child); 
                    //return;
                }  

                if(child.children.length !== 0 )
                {
                    if(child.children[0].type === "BonesHelper")
                    {
                        additionalObjects[sceneMesh.uuid] = child.children[0].conesGroup.children;
                        return;
                    }

                    if(child.children[0].type === "LOD")
                    {
                        meshes.push(child.children[0].children[0]);
                        //continue;
                    }
                    else if(child.children[0].type === "SkinnedMesh")
                    {
                        meshes.push(child.children[0]);
                        //continue;
                    }
                }
            }   
        }
        for(let i = 0, n = sceneChildren.length; i < n; i++)
        {
            this.getAllSceneMeshes(sceneChildren[i], meshes);
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
