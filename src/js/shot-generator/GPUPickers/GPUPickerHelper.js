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
        this.renderTarget = new THREE.WebGLRenderTarget(0, 0);
    }
    
    pick(cssPosition, scene, camera, renderer, wall)
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
        this.renderTarget.setSize(renderer.domElement.width, renderer.domElement.height);

        renderer.setRenderTarget(this.renderTarget);
        renderer.render(scene, camera);
        renderer.setRenderTarget(null);
        wall.material.map = this.renderTarget.texture;
        wall.needsUpdate = true;
        wall.material.map.repeat.set( 1, 1 );
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
            console.log(id);
            const intersectedObject = this.selectableObjects[id];
            if(intersectedObject)
            {
                this.pickedObject = intersectedObject;
                this.pickedObjectSaveColor = this.pickedObject.material.color.clone();
                this.pickedObject.material.color =  this.selectedColor;
            }
            console.log(this.selectableObjects);
        }

}
module.exports = GPUPickerHelper;
