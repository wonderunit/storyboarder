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
        this.selectedColor = new THREE.Color(1, 0.5, 0);
        this.renderTarget = new THREE.WebGLRenderTarget(0, 0);
        this.returnObject = [];
    }
    
    pick(cssPosition, scene, camera, renderer, wall)
    {
        const {pickingTexture, pixelBuffer} = this;
   
        if(this.pickedObject)
        {
            this.pickedObject.material.color = this.pickedObjectSaveColor;
            this.pickedObject = undefined;
            this.returnObject = [];
        }
        let vrEnabled = renderer.vr.enabled;
        renderer.vr.enabled = vrEnabled ? false : false;
        const pixelRatio = renderer.getPixelRatio();

        camera.setViewOffset(
            renderer.domElement.width,
            renderer.domElement.height,
            cssPosition.x * pixelRatio | 0,
            cssPosition.y * pixelRatio | 0,
            1,
            1);

        renderer.setRenderTarget(pickingTexture);
        renderer.render(scene, camera);
        renderer.setRenderTarget(null);
        camera.clearViewOffset();
        console.log(scene);
        if(wall)
        {
            this.renderTarget.setSize(renderer.domElement.width, renderer.domElement.height);
            renderer.setRenderTarget(this.renderTarget);
            renderer.render(scene, camera);
            renderer.setRenderTarget(null);
            wall.material.map = this.renderTarget.texture;
        }
        renderer.vr.enabled = vrEnabled ? true : false;
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
        if(intersectedObject)
        {
            this.pickedObject = intersectedObject;
            this.pickedObjectSaveColor = this.pickedObject.material.color.clone();
            this.pickedObject.material.color =  this.selectedColor;
        }
        if(!intersectedObject)
        {
            return this.returnObject;
        }

        //if(intersectedObject.type === "SkinnedMesh")
        //{
        //    this.returnObject.push( intersectedObject.parent});
        //}
        //else
        {
            
            this.returnObject.push(intersectedObject);
        }
   
        console.log(intersectedObject);
        console.log(this.selectableObjects);
        console.log(scene);
        return this.returnObject;
    }
}
module.exports = GPUPickerHelper;
