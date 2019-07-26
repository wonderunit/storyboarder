class GPUPickerHelper
{
    constructor()
    {
        this.pickingTexture = new THREE.WebGLRenderTarget(1, 1);
        this.pixelBuffer = new Uint8Array(4);
        this.pickedObject = null;
        this.pickedObjectSaveColor = 0;
        this.selectableObjects = {};
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
            renderer.context.drawingBufferWidth,
            renderer.context.drawingBufferHeight,
            cssPosition.x * pixelRatio | 0,
            cssPosition.y * pixelRatio | 0,
            1,
            1
        );

        renderer.setRenderTarget(pickingTexture);
        renderer.render(scene, camera);
        renderer.setRenderTarget(null);

        //camera.clearViewOffset();
        let renderTarget = renderer.getRenderTarget();
        console.log(renderTarget);

        renderer.readRenderTargetPixels(
            pickingTexture,
            0,
            0,
            1,
            1,
            pixelBuffer);

            console.log(pickingTexture);
        const id =
            (pixelBuffer[0] << 16) |
            (pixelBuffer[1] << 8) |
            (pixelBuffer[2]);

        const intersectedObject = this.selectableObjects[id];
        console.log(id);
        if(intersectedObject)
        {
            this.pickedObject = intersectedObject;
            this.pickedObjectSaveColor = this.pickedObject.material.color;
            this.pickedObject.material.color = { r : 0.2, g: 0.2, b: 0.2};
            //this.pickedObject.material.emissive.setHex(0xFF0000);
        }
    }

}
module.exports = GPUPickerHelper;
