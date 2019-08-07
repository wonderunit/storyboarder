const THREE = require('three');
class GPUPickerHelper
{
    constructor()
    {
        this.pickingTexture = new THREE.WebGLRenderTarget(1, 1);
        
        this.pickingTexture.texture.minFilter = THREE.LinearFilter;
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
        this.testScene = new THREE.Scene();
        this.unpackDownscale = 255. / 256.;
        this.unPackFactors = new THREE.Vector4( this.unpackDownscale / (256*256*256), this.unpackDownscale / (256*256), this.unpackDownscale / 256, this.unpackDownscale / 1 );
        this.pickedSkinnedMesh = null;
        this.reusableVector = new THREE.Vector3();
    }
    
    pick(cssPosition, scene, camera, renderer, selectables, pickingBones = false)
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
            
        let id =
            (pixelBuffer[0] << 16) |
            (pixelBuffer[1] << 8) |
            (pixelBuffer[2]);

        const intersectedObject = selectables[id];
        let canvasPos = null;
        if(intersectedObject)
        {
            this.pickedObject = intersectedObject.originObject;
            if(!pickingBones)
            {
                let selectedObject = intersectedObject.pickerObject;
                if(this.pickedObject.type === "SkinnedMesh")
                {
                    this.pickedSkinnedMesh = intersectedObject;
                }
                scene.remove(selectedObject);
                this.depthScene.add(selectedObject);
                this.readRenderedPixel(renderer, this.depthScene, camera, pickingTexture, pixelBuffer);
                this.depthScene.remove(selectedObject);
                scene.add(selectedObject);
                canvasPos = this.unpackRGBAToScenePosition(pixelBuffer, cssPosition, camera, renderer);
            }
        }
        camera.clearViewOffset();
        renderer.vr.enabled = vrEnabled ? true : false;
        let returnObject = [];
        if(!intersectedObject)
        {
            return returnObject;
        }
        returnObject.push({ object: this.pickedObject, point: canvasPos});
        return returnObject;
    }

    tryPickCones(renderer, camera, pickingObject)
    {
        let {pickingTexture, pixelBuffer, testScene} = this;
        testScene.add(pickingObject.cones);
        this.readRenderedPixel(renderer, this.testScene, camera, pickingTexture, pixelBuffer);
        this.testScene.remove(pickingObject.cones);
            
        let id =
            (pixelBuffer[0] << 16) |
            (pixelBuffer[1] << 8) |
            (pixelBuffer[2]);

        const intersectedObject = pickingObject.selectable[id];
        return intersectedObject ? intersectedObject.originObject : intersectedObject;
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
