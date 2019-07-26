const THREE = require('three');
class GPUPickerHelper
{
    constructor()
    {
        this.pickingTexture = new THREE.WebGLRenderTarget(1, 1);
        this.pickingTexture.texture.minFilter = THREE.LinearFilter;
        this.pixelBuffer = new Uint8Array(4);
        this.pickedObject = null;
        this.pickedObjectSaveColor = 0;
        this.selectableObjects = {};
        this.selectedColor = new THREE.Color(0.2, 0.2, 0.2);
    }
    
    pick(cssPosition, scene, camera, renderer)
    {
        const {pickingTexture, pixelBuffer} = this;
       
        if(this.pickedObject)
        {
            this.pickedObject.material.color = this.pickedObjectSaveColor;
            this.pickedObject = undefined;
        }

        const pixelRatio = renderer.getPixelRatio();
        camera.setViewOffset(
            renderer.domElement.width,
            renderer.domElement.height,
            cssPosition.x * pixelRatio | 0,
            cssPosition.y * pixelRatio | 0,
            1,
            1
        );

        renderer.setRenderTarget(pickingTexture);
        renderer.render(scene, camera);
        renderer.setRenderTarget(null);

        camera.clearViewOffset();
        renderer.readRenderTargetPixels(
            pickingTexture,
            0, 
            0,
            1,
            1,
            pixelBuffer);

        const id =
            (pixelBuffer[0] << 16) |
            (pixelBuffer[1] << 8) |
            (pixelBuffer[2]);

        const intersectedObject = this.selectableObjects[id];
        console.log(id);
        if(intersectedObject)
        {
            this.pickedObject = intersectedObject;
            this.pickedObjectSaveColor = this.pickedObject.material.color.clone();
            this.pickedObject.material.color =  this.selectedColor;
        }
    }

}
module.exports = GPUPickerHelper;
