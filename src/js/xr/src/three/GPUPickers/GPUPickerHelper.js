const THREE = require('three');
const {unpackRGBAToScenePosition} = require("./utils/UnpackRGB");
class GPUPickerHelper
{
    constructor()
    {
        this.pickingTexture = new THREE.WebGLRenderTarget(1, 1, {minFilter: THREE.LinearFilter});
        this.renderTarget = new THREE.WebGLRenderTarget(0, 0, {minFilter: THREE.LinearFilter});
        this.pixelBuffer = new Uint8Array(4);
        this.pickedObject = null;
        this.selectableObjects = {};
        this.depthMaterial = new THREE.MeshDepthMaterial(
            { 
                depthTest: true,
                depthWrite: true,
                skinning: true,
                morphTargets: true,
                depthPacking: THREE.RGBADepthPacking,
                side: THREE.FrontSide,
                blending: THREE.NoBlending
            });
        this.depthScene = new THREE.Scene();
        this.depthScene.overrideMaterial = this.depthMaterial;
        this.depthScene.needsUpdate = true;
        this.depthScene.autoUpdate = false;
        this.reusableVector = new THREE.Vector3();
    }
    
    pick(cssPosition, scene, camera, renderer, selectables)
    {
        let {pickingTexture, pixelBuffer} = this;
   
        if(this.pickedObject)
        {
            this.pickedObject = undefined;
        }
        let vrEnabled = renderer.vr.enabled;
        renderer.vr.enabled = false;
        const pixelRatio = renderer.getPixelRatio();
        camera.setViewOffset(
            renderer.domElement.width,
            renderer.domElement.height,
            cssPosition.x * pixelRatio | 0,
            cssPosition.y * pixelRatio | 0,
            1,
            1);

        this.readRenderedPixel(renderer, scene, camera, pickingTexture, pixelBuffer);
  
        let id = (pixelBuffer[0] << 16) |
                 (pixelBuffer[1] << 8) |
                 (pixelBuffer[2]);

        const intersectedObject = selectables[id];
        let canvasPos = this.reusableVector.set(0, 0, 0);
        if(intersectedObject)
        {
            this.pickedObject = intersectedObject.originObject;
            let selectedObject = intersectedObject.pickerObject;
            //if(this.pickedObject.type === "SkinnedMesh")
            {
                this.depthScene.attach(selectedObject);
                this.readRenderedPixel(renderer, this.depthScene, camera, pickingTexture, pixelBuffer);
                scene.attach(selectedObject);
                unpackRGBAToScenePosition(canvasPos, pixelBuffer, cssPosition, camera, renderer);
            }
        }
        camera.clearViewOffset();
        renderer.vr.enabled = vrEnabled ? true : false;
        
        if(!intersectedObject)
        {
            return [];
        }

        return [{ object: this.pickedObject, point: canvasPos, distance: camera.worldPosition().distanceTo(canvasPos)}];
    }
    
    readRenderedPixel(renderer, scene, camera, renderTarget, pixelBuffer)
    {
        renderer.setRenderTarget(renderTarget);
        renderer.render(scene, camera);
        renderer.setRenderTarget(null);
        renderer.readRenderTargetPixels(
            renderTarget,
            0, 
            0,
            1,
            1,
            pixelBuffer);
    }
}
module.exports = GPUPickerHelper;
