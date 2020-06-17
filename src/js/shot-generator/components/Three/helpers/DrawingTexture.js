
import * as THREE from 'three'
import SimpleMesh from './Meshes/SimpleMesh'
import EraserMesh from './Meshes/EraserMesh'
class DrawingTexture {
    constructor() {
        this.drawingCanvases = [];
        this.drawingCtxes = [];
        this.raycaster = new THREE.Raycaster();
        this.texture = null;
        this.drawingMesh = null;
        this.isChanged = false;
        this.setMesh();
    }

    resetMeshPos() {
        this.drawingMesh.resetMeshPos();
    }

    setMesh(type) {
        switch(type) {
            case "Simple":
                this.drawingMesh = new SimpleMesh();
                break;
            case "Eraser":
                this.drawingMesh = new EraserMesh();
                break;
            default: 
                this.drawingMesh = new SimpleMesh();
        }
    }

    cleanImage() {
        let width, height, canvas, context;
        for(let i = 0; i < this.drawingCtxes.length; i++) {
            canvas = this.drawingCanvases[i];
            context = this.drawingCtxes[i];
            width = this.drawingCanvases[i].width;
            height = this.drawingCanvases[i].height;
            context.fillStyle = "#ffffff";
            context.fillRect(0, 0, width, height);
        }
        this.texture.needsUpdate = true;
    }

    getImage() {
        let mime = "images/jpeg";
        let images = [];
        for( let i = 0; i < this.drawingCanvases.length; i++){
            images.push(this.drawingCanvases[i].toDataURL(mime));
        }
        return images
    }

    createMaterial(texture) {
        this.texture = texture
    }

    setTexture(texture) {
        this.texture = texture
    }    

    intersectImage (x, y, object, camera) {
        this.raycaster.setFromCamera({x,y}, camera);
        let intersects = this.raycaster.intersectObject(object, true);
        return intersects.length && intersects[0];
    }
  
    draw (mousePosition, object, camera, mesh) {

        let intersection = this.intersectImage(mousePosition.x, mousePosition.y, object, camera);
        if(intersection.uv === null) {
            this.resetMeshPos();
            return;
        }
        this.isChanged = true;
        return intersection

    }
}
export default DrawingTexture;
