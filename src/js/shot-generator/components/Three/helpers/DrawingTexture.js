
import * as THREE from 'three'
import CurveBrush from './Brushes/CurveBrush'
import EraserBrush from './Brushes/EraserBrush'
import BrushType from '../Helpers/Brushes/TextureBrushTypes'
class DrawingTexture {
    constructor() {
        this.drawingCanvases = [];
        this.drawingCtxes = [];
        this.raycaster = new THREE.Raycaster();
        this.texture = null;
        this.drawingBrush = null;
        this.isChanged = false;
        this.setMesh();
        this.prevMousePosition;
    }

    prepareToDraw() {
        this.drawingBrush.startDrawing();
    }

    endDraw() {
        this.drawingBrush.stopDrawing();
        this.isChanged = false;
    }

    setMesh(type) {
        if(this.drawingBrush) this.drawingBrush.cleanUp()
        switch(type) {
            case BrushType.SIMPLE:
                this.drawingBrush = new CurveBrush();
                break;
            case BrushType.ERASER:
                this.drawingBrush = new EraserBrush();
                break;
            default: 
                this.drawingBrush = new CurveBrush();
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
  
    draw (mousePosition, object, camera, onlyContinuousDrawing) {

        let intersection = onlyContinuousDrawing ? false : this.intersectImage(mousePosition.x, mousePosition.y, object, camera);
        if(!intersection || intersection.uv === null) {
            return;
        }
        this.isChanged = true;
        this.isNeedSaving = true;
        this.prevMousePosition = mousePosition;
        return intersection;

    }
}
export default DrawingTexture;
