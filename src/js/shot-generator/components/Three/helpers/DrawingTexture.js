
import * as THREE from 'three'
import SimpleBrush from './Brushes/SimpleBrush'
import EraserBrush from './Brushes/EraserBrush'
class DrawingTexture {
    constructor() {
        this.drawingCanvases = [];
        this.drawingCtxes = [];
        this.raycaster = new THREE.Raycaster();
        this.texture = null;
        this.drawingBrush = null;
        this.isChanged = false;
        this.setMesh();
    }

    prepareToDraw() {
        this.drawingBrush.startDrawing();
    }

    endDraw() {
        this.drawingBrush.stopDrawing();
    }

    setMesh(type) {
        if(this.drawingBrush) this.drawingBrush.cleanUp()
        switch(type) {
            case "Simple":
                this.drawingBrush = new SimpleBrush();
                break;
            case "Eraser":
                this.drawingBrush = new EraserBrush();
                break;
            default: 
                this.drawingBrush = new SimpleBrush();
        }
    }

    cleanImage() {
        let width, height, canvas, context;
        for(let i = 0; i < this.drawingCtxes.length; i++) {
            canvas = this.drawingCanvases[i];
            context = this.drawingCtxes[i];
            width = canvas.width;
            height = canvas.height;
            context.fillStyle = "#ffffff";
            context.fillRect(0, 0, width, height);
        }
        this.texture.needsUpdate = true;
    }

    getImage(mime) {
        let images = [];
        for( let i = 0; i < this.drawingCanvases.length; i++){
            images.push(this.drawingCanvases[i].toDataURL(mime));
        }
        return images;
    }

    createMaterial(texture) {
        this.texture = texture;
    }

    setTexture(texture) {
        this.texture = texture;
    }    

    intersectImage (x, y, object, camera) {
        this.raycaster.setFromCamera({x,y}, camera);
        let intersects = this.raycaster.intersectObject(object, true);
        return intersects.length && intersects[0];
    }
  
    draw (mousePosition, object, camera) {

        let intersection = this.intersectImage(mousePosition.x, mousePosition.y, object, camera);
        if(intersection.uv === null) {
            return;
        }
        this.isChanged = true;
        return intersection;

    }
}
export default DrawingTexture;
