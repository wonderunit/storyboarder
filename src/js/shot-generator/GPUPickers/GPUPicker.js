const THREE = require("three");
const XRGPUPickerController = require("./Controllers/XRGPUPickerController");
class GPUPicker
{
    constructor(renderer)
    {
        this.renderer = renderer;
        this.camera = new THREE.PerspectiveCamera(0.001, renderer.domElement.width / renderer.domElement.height, 0.1, 1000 );
        this.controller = new XRGPUPickerController();
        //TODO():Don't set rendere pass it as an argument
        this.controller.renderer = renderer;
    }   

    setupScene(objects)
    {
        this.controller.initalizeChildren(objects);
        this.controller.updateObject();
        this.controller.setPickingPosition((this.renderer.domElement.width) / 2, (this.renderer.domElement.height) / 2);
    }

    pick(position, rotation)
    {
        this.camera.position.copy(position);
        if(rotation instanceof THREE.Quaternion)
        {
            this.camera.rotation.setFromQuaternion(rotation);
        }
        else
        {
            this.camera.rotation.copy(rotation);
        }
        this.camera.updateMatrixWorld(true);
        return this.controller.pick(this.camera);
    }
}
module.exports = GPUPicker;
