import * as THREE from 'three'
import DrawingTexture from './DrawingTexture'
class SimpleTexture extends DrawingTexture {
    constructor(){
        super();
        this.material = null;
        let canvas = document.createElement('canvas');
        let ctx = canvas.getContext('2d');

        this.drawingCanvases.push(canvas);
        this.drawingCtxes.push(ctx);
    }

    getImage() { 
        return super.getImage()[0];

    }

    setMesh(type) {
        super.setMesh(type);
        if(this.drawingCtxes[0]) {
            this.drawingMesh.drawingCtx = this.drawingCtxes[0];
        }
    }

    createMaterial(material) {
        super.createMaterial(material.map);
        
        let canvasTexture = new THREE.CanvasTexture(this.drawingCanvases[0]);
        this.texture = canvasTexture;
        material.map = canvasTexture;
        this.material = material;
        material.map.needsUpdate = true;
        material.needsUpdate = true;
        this.drawingMesh.drawingCtx = this.drawingCtxes[0];
        return material;
    }

    setTexture(texture) {
        super.setTexture(this.texture);
        const { width, height } = texture.image;
        this.drawingCanvases[0].width = width;
        this.drawingCanvases[0].height = height;
        
        this.drawingCtxes[0].drawImage(texture.image, 0, 0, width, height);
        this.texture.needsUpdate = true;
        this.material.needsUpdate = true;
    }    
  
    draw (mousePosition, object, camera, mesh){
        let intersection = super.draw(mousePosition, object, camera, mesh)
        if(!intersection) return
        let screenX = (intersection.uv.x) * this.texture.image.width;
        let screenY = (1 - intersection.uv.y) * this.texture.image.height;
        this.drawingMesh.draw({ x: screenX, y: screenY }, mesh)

        this.texture.needsUpdate = true;

    }
}
export default SimpleTexture;