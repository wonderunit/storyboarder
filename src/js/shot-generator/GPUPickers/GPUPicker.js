const THREE = require('three');
const GPUPickerHelper = require("./GPUPickerHelper");
const XRGPUPickerFactory = require("./XRGPUPickerFactory");
require("../IK/utils/Object3dExtension");
class GPUPicker
{
    constructor()
    {
        this.pickingScene = new THREE.Scene();
        this.pickingPosition = new THREE.Vector2();
        this.gpuPickerHelper = new GPUPickerHelper();
        this.pickingScene.background = new THREE.Color(0);
        this.isInitialized = false;
        this.idBonus = 1;
        this.allowedObjectsTypes = [];
        this.gpuPickerFactory = null;
    }

    addAllowedObject(allowedType)
    {
        this.allowedObjectsTypes.push(allowedType);
    }

    initialize(scene, renderer)
    {
        if(this.isInitialized )
        {
            return;
        }
        this.children = scene.children;
        this.renderer = renderer;
        this.isInitialized = true;
        this.bonesScene = new THREE.Scene();
    }

    setPickingPosition(vector2)
    {
        this.pickingPosition.copy(vector2);
    }

    setPickingPosition(x, y)
    {
        this.pickingPosition.x = x;
        this.pickingPosition.y = y;
    }

    pick(camera)
    {
        return this.gpuPickerHelper.pick(this.pickingPosition, this.pickingScene, camera, this.renderer, this.gpuPickerHelper.selectableObjects, false);
    }

    pickBone(camera)
    {
        if(this.gpuPickerHelper.pickedSkinnedMesh)
        {
            let picker = this.gpuPickerHelper.pickedSkinnedMesh.pickerObject;
            let cones = picker.cones;
            let originObject = this.gpuPickerHelper.pickedSkinnedMesh.originObject;
            this.bonesScene.add(cones);
            let result = this.gpuPickerHelper.pick(this.pickingPosition, this.bonesScene, camera, this.renderer, picker.selectable, true);
            if(result.length === 0)
            {
                return result;
            }
            this.bonesScene.remove(cones);
            return result;
        }
        return [];
    }

    initializeCones(cones, bones)
    {
        let pickingCones = new THREE.Group();
        let selectableCones = [];
        for(let i = 0, n = cones.length; i < n; i++)
        {
            let object = cones[i];
            const id = i + this.idBonus;
            const pickingMaterial = new THREE.MeshToonMaterial({
                emissive: new THREE.Color(id),
                color: new THREE.Color(0, 0, 0),
                specular: 0x0,
                shininess: 0,
                flatShading: false,
            });
            let pickingCube = null;
            pickingCube = new THREE.Mesh(object.geometry, pickingMaterial);
            pickingCube.type = object.userData.type;
            pickingCube.originCone = object;
            pickingCones.add(pickingCube);
            let bone = bones.find(obj => object.userData.bone === obj.uuid);
            selectableCones[id] = {originObject:object, pickerObject: pickingCube, originalBone: bone };
        }
        return {cones:pickingCones, selectable: selectableCones};
    }

    updateCones(cones)
    {
        for(let i = 0, n = cones.children.length; i < n; i++)
        {
            let cone = cones.children[i];
            let originalCone = cone.originCone;
            cone.position.copy(originalCone.worldPosition());
            cone.quaternion.copy(originalCone.worldQuaternion());
            cone.scale.copy(originalCone.worldScale());
            //TODO(): probably run needs update
            cone.updateMatrixWorld(true);
        }
    }

    updateSkeletonBone(cloneBone, originalBone)
    {
        cloneBone.position.copy(originalBone.position);
        cloneBone.quaternion.copy(originalBone.quaternion);
        cloneBone.scale.copy(originalBone.scale);
        for(let i = 0, n = cloneBone.children.length; i < n; i++)
        {   
            this.updateSkeletonBone(cloneBone.children[i], originalBone.children[i]);
        }
    }

    isObjectAdded(object)
    {
        let addedObject = Object.values(this.gpuPickerHelper.selectableObjects).find(obj => obj.originObject.uuid === object.uuid);
        if(addedObject)
        {
            //addedObject.pickerObject.visible = object.visible;
            return true;
        }
        return false;
    }

    updateCurrentCharacter()
    {
        if(!this.gpuPickerHelper.pickedSkinnedMesh)
        {
            return;
        }
        let picker = this.gpuPickerHelper.pickedSkinnedMesh.pickerObject;
        this.updateCones(picker.cones);
    }

    //#region Virtual merhods
    initalizeChildren(scene)
    {
    }

    updateObject()
    {
    }

    getAllSceneMeshes(sceneMesh, meshes, additionalObjects)
    {
    }
    //#endregion  
}
module.exports = GPUPicker;
