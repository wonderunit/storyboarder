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

    pick(camera, wall)
    {
        return this.gpuPickerHelper.pick(this.pickingPosition, this.pickingScene, camera, this.renderer, wall);
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

    //#region Virtual merhods
    initalizeChildren(scene)
    {
    }

    updateObject()
    {
    }

    getAllSceneMeshes(sceneMesh, meshes)
    {
    }
    //#endregion  
}
module.exports = GPUPicker;
