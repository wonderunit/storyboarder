const THREE = require('three');
class GPUPickerHelper
{
    constructor()
    {
        this.pickingTexture = new THREE.WebGLRenderTarget(1, 1, {minFilter: THREE.LinearFilter});
        this.pixelBuffer = new Uint8Array(4);
        this.pickedObject = null;
        this.selectableObjects = {};
        this.selectedColor = new THREE.Color(1, 0.5, 0);
        this.renderTarget = new THREE.WebGLRenderTarget(0, 0, {minFilter: THREE.LinearFilter});
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
        this.unpackDownscale = 255. / 256.;
        this.unPackFactors = new THREE.Vector4( this.unpackDownscale / (256*256*256), this.unpackDownscale / (256*256), this.unpackDownscale / 256, this.unpackDownscale / 1 );
        this.pickedSkinnedMesh = null;
        this.reusableVector = new THREE.Vector3();
    }
    
    pick(cssPosition, scene, camera, renderer, selectables, pickingBones = false, wall)
    {
        let {pickingTexture, pixelBuffer} = this;
   
        if(this.pickedObject)
        {
            this.pickedObject = undefined;
            if(!pickingBones)
            {
                this.pickedSkinnedMesh = null;
            }
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
            if(!pickingBones)
            {
                let selectedObject = intersectedObject.pickerObject;
                if(this.pickedObject.type === "SkinnedMesh")
                {
                    this.pickedSkinnedMesh = intersectedObject;
                    this.depthScene.attach(selectedObject);
                    this.readRenderedPixel(renderer, this.depthScene, camera, pickingTexture, pixelBuffer);
                    scene.attach(selectedObject);
                    canvasPos = this.unpackRGBAToScenePosition(pixelBuffer, cssPosition, camera, renderer);
                }
            }
        }
        camera.clearViewOffset();
        if(wall)
        {
            this.renderTarget.setSize(renderer.domElement.width, renderer.domElement.height);
            renderer.setRenderTarget(this.renderTarget);
            renderer.render(scene, camera);
            renderer.setRenderTarget(null);
            wall.material.map = this.renderTarget.texture;
            wall.needsUpdate = true;
            wall.material.needsUpdate = true;
        }
        renderer.vr.enabled = vrEnabled ? true : false;
        
        let returnObject = [];
        if(!intersectedObject)
        {
            return returnObject;
        }
        if(pickingBones)
        {
            returnObject.push({ object: this.pickedObject, point: canvasPos, bone: intersectedObject.originalBone });
        }
        else
        {
            returnObject.push({ object: this.pickedObject, point: canvasPos});
        }

        return returnObject;
    }

    unpackRGBAToScenePosition( rgba, cssPosition, camera, renderer ) 
    {
        let canvasPos = this.reusableVector;
        let vector = new THREE.Vector4().fromArray(rgba).multiplyScalar(1/255);
        let zDepth = vector.dot(this.unPackFactors );

        let x = cssPosition.x / renderer.domElement.width;
        let y = cssPosition.y / renderer.domElement.height;
        x = 2 * x - 1; 
        y = 2 * (1 - y) - 1; 
        zDepth = 2 * zDepth - 1;
        canvasPos.set(x, y, zDepth);
        canvasPos.applyMatrix4(camera.projectionMatrixInverse);
        canvasPos.applyMatrix4(camera.matrixWorld);
    	return canvasPos;
    }
    
    readRenderedPixel(renderer, scene, camera, renderTarget, pixelBuffer)
    {
        renderer.setRenderTarget(renderTarget);
        scene.autoUpdate = false;
        renderer.render(scene, camera);
        renderer.setRenderTarget(null);
        scene.autoUpdate = true;
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
