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
        this.renderTarget = new THREE.WebGLRenderTarget(0, 0, {
            minFilter: THREE.LinearFilter,
            magFilter: THREE.LinearFilter
          });
       
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
        this.depthScene.background = new THREE.Color(255, 255, 255);
        this.depthScene.overrideMaterial = this.depthMaterial;
        this.depthScene.needsUpdate = true;
        this.directionalLight = new THREE.DirectionalLight( 0xffffff, 0.5 );
        this.depthScene.add(  this.directionalLight );

        this.unpackDownscale = 255. / 256.;
        this.unPackFactors = new THREE.Vector4( this.unpackDownscale / (256*256*256), this.unpackDownscale / (256*256), this.unpackDownscale / 256, this.unpackDownscale / 1 );
    }
    
    pick(cssPosition, scene, camera, renderer, wall)
    {
        const {pickingTexture, pixelBuffer} = this;
   
        if(this.pickedObject)
        {
            this.pickedObject.material.color = this.pickedObjectSaveColor;
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
            wall.needsUpdate = true;
            wall.material.needsUpdate = true;
        }
        
        renderer.readRenderTargetPixels(
            pickingTexture,
            0, 
            0,
            1,
            1,
            pixelBuffer);
            
        let id =
            (pixelBuffer[0] << 16) |
            (pixelBuffer[1] << 8) |
            (pixelBuffer[2]);

        const intersectedObject = this.selectableObjects[id];
        let canvasPos = new THREE.Vector3();
        if(intersectedObject)
        {
            this.pickedObject = intersectedObject;
            if(this.pickedObject.material.color)
            {
                this.pickedObjectSaveColor = this.pickedObject.material.color.clone();
                this.pickedObject.material.color =  this.selectedColor;
            }
            let selectedObject = scene.children.find(child => child.pickerId === id);
            console.log(selectedObject);
            this.directionalLight.updateMatrixWorld(true);
            ///if(selectedObject.type ===)
            scene.remove(selectedObject);
            this.depthScene.add(selectedObject);
            console.log(this.depthScene.clone());
            this.depthScene.overrideMaterial.map = intersectedObject.material.map;
            this.depthScene.needsUpdate = true;
            camera.setViewOffset(
                renderer.domElement.width,
                renderer.domElement.height,
                cssPosition.x * pixelRatio | 0,
                cssPosition.y * pixelRatio | 0,
                1,
                1);
            renderer.setRenderTarget(pickingTexture);
            renderer.render(this.depthScene, camera);
            renderer.setRenderTarget(null);
            camera.clearViewOffset();
          
            this.depthScene.remove(selectedObject);
            scene.add(selectedObject);
            
            renderer.readRenderTargetPixels(
                pickingTexture,
                0, 
                0,
                1,
                1,
                pixelBuffer);
            let vector = new THREE.Vector4().fromArray(pixelBuffer).multiplyScalar(1/255);
            let zDepth = this.unpackRGBAToDepth(vector);

            let x = cssPosition.x / renderer.domElement.width;
            let y = cssPosition.y / renderer.domElement.height;
            x = 2 * x - 1; 
            y = 2 * (1 - y) - 1; 
            zDepth = 2 * zDepth - 1;
            canvasPos.set(x, y, zDepth);
            canvasPos.applyMatrix4(camera.projectionMatrixInverse);
            canvasPos.applyMatrix4(camera.matrixWorld);
            console.log(canvasPos);
        }
        renderer.vr.enabled = vrEnabled ? true : false;
        let returnObject = [];
        if(!intersectedObject)
        {
            return returnObject;
        }
        if(intersectedObject.type === "SkinnedMesh")
        {
            returnObject.push({ object: intersectedObject.parent, point: canvasPos});
        }
        else
        {
            returnObject.push({ object: intersectedObject, point: canvasPos});
        }
        console.log(returnObject);
        console.log(this.selectableObjects);
        return returnObject;
    }

    unpackRGBAToDepth( v ) 
    {
    	return  v.dot(this.unPackFactors );
    }
}
module.exports = GPUPickerHelper;
