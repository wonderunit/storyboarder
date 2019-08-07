const THREE = require('three');
const GPUPickerHelper = require("./GPUPickerHelper");
const SkeletonUtils = require("../IK/utils/SkeletonUtils");
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
        this.vrModeEnabled = false;
        this.allowedObjectsTypes = [];
    }

    initialize(scene, renderer)
    {
        if(this.isInitialized )
        {
            return;
        }
        this.pickingScene.background = new THREE.Color(0);
        this.children = scene.children;
        this.renderer = renderer;
        this.vrModeEnabled = renderer.vr.enabled;
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
        return this.gpuPickerHelper.pick(this.pickingPosition, this.pickingScene, camera, this.renderer, this.gpuPickerHelper.selectableObjects);
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
            result[0].bone = originObject.parent.parent.bonesHelper.bones.find(bone => bone.uuid === result[0].object.userData.bone)
            return result;
        }
        return [];
    }

    initializeCones(cones)
    {
        let pickingCones = new THREE.Group();
        let selectableCones = [];
        for(let i = 0, n = cones.length; i < n; i++)
        {
            let object = cones[i];
            const id = 400 + i + this.idBonus;
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
            selectableCones[id] = {originObject:object, pickerObject: pickingCube};
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
        if(Object.values(this.gpuPickerHelper.selectableObjects).filter(obj => obj.uuid === object.uuid).length !== 0)
        {
            return true;
        }
        return false;
    }

    addConesToArray(source, array)
    {
        let index = 4;
        for(let i = 0, n = array.length; i < n; i+=index)
        {
            source.push(array[i]);
            source.push(array[i + 1]);
            source.push(array[i + 2]);
            source.push(array[i + 3]);

        }
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
