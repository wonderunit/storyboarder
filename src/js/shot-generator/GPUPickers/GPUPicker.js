const THREE = require("three");
const XRGPUPickerController = require("./Controllers/XRGPUPickerController");
class GPUPicker
{
    constructor(renderer)
    {
        this.renderer = renderer;
        this.camera = new THREE.PerspectiveCamera(0.001, renderer.domElement.width / renderer.domElement.height, 0.1, 1000 );
        this.controller = new XRGPUPickerController();
        this.cameraHelper = null;
    }   

    setupScene(objects)
    {
        this.controller.initalizeChildren(objects);
        this.controller.updateObjects();
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
        return this.controller.pick(this.camera, this.renderer);
    }

    // Creates a CameraHeleper which needed to be added to a scene in order to help to figure out
    // where current position of the GPUPicker camera
    getCameraHelper()
    {
        if(this.cameraHelper)
        {
            return this.cameraHelper;
        }
        this.cameraHelper = new THREE.CameraHelper(this.camera);
        return this.cameraHelper;
    }
}
module.exports = GPUPicker;
