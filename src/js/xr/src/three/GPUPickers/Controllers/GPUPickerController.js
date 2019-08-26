const THREE = require('three');
const GPUPickerHelper = require("../GPUPickerHelper");
require("../utils/Object3dExtension");
const IdPool = require("../utils/IdPool");
class GPUPickerController
{
    constructor()
    {
        if(new.target === GPUPickerController)
        {
            throw new TypeError("Cannot construct abstract GPUPickerController directly");
        }

        if(this.initalizeChildren === undefined)
        {
            throw new TypeError("Must override method initalizeChildren(objects)");
        }

        if(this.updateObjects === undefined)
        {
            throw new TypeError("Must override method updateObjects()");
        }

        this.pickingScene = new THREE.Scene();
        this.pickingPosition = new THREE.Vector2();
        this.gpuPickerHelper = new GPUPickerHelper();
        this.pickingScene.background = new THREE.Color(0);
        this.gpuPickerFactory = null;
        this.pickableObjects = [];
        this.bonesScene = new THREE.Scene();
        this.idPool = new IdPool(600);
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

    pick(camera, renderer)
    {
        return this.gpuPickerHelper.pick(this.pickingPosition, this.pickingScene, camera, renderer, this.gpuPickerHelper.selectableObjects, false);
    }
}
module.exports = GPUPickerController;
