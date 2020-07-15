
import * as THREE from 'three'
import DrawingTexture from './DrawingTexture'
class CubeMapDrawingTexture extends DrawingTexture {
    constructor() {
        super();
        this.prevFaceIndex;
    }

    createMaterial(texture) {
        super.createMaterial(texture);
        this.drawingCanvases = [];
        this.drawingCtxes = [];
        for( let i = 0; i < texture.image.length; i++ ) {
            let canvas =  document.createElement('canvas');
            let context = canvas.getContext('2d');
            canvas.width = texture.image[i].width;
            canvas.height = texture.image[i].height;
            let image = texture.image[i];
            context.drawImage(image, 0, 0);
            let drawingTexture = new THREE.CanvasTexture(canvas);
            texture.image[i] = drawingTexture.image;
            this.drawingCanvases.push(canvas);
            this.drawingCtxes.push(context);
        }
        texture.needsUpdate = true;
    }

    setTexture(texture) {
        super.setTexture(texture)
        for( let i = 0; i < texture.image.length; i++ ) {
            let image = texture.image[i];
            canvas = this.drawingCanvases[i];
            context = this.drawingCtxes[i];
            this.drawingCanvases[i].width = image.width;
            this.drawingCanvases[i].height = image.height;
            this.drawingCtxes.drawImage(image, 0, 0, image.width, image.height);
        }
        this.texture.needsUpdate = true;
    }    
  
    draw (mousePosition, object, camera, brush) {
 
        let intersection = super.draw(mousePosition, object, camera, brush)
        if(!intersection) return;
        let index;
        if(intersection.face.normal.x) {
            let x = intersection.face.normal.x;
            index = x === -1 ? 0 : 1;
        } else if( intersection.face.normal.y )  {
            let x = intersection.face.normal.y;
            index = x === -1 ? 3 : 2;
        } else if( intersection.face.normal.z )  {
            let x = intersection.face.normal.z;
            index = x === -1 ? 5 : 4;
        }
        if( this.prevFaceIndex !== null && this.prevFaceIndex !== index ) {
            this.drawingBrush.stopDrawing();
            this.drawingBrush.startDrawing();
        }
        this.prevFaceIndex = index;
        let screenX = (1 - intersection.uv.x) * this.texture.image[index].width;
        let screenY = (1 - intersection.uv.y) * this.texture.image[index].height;
        let drawingContext = this.drawingCtxes[index];
        this.drawingBrush.drawingCtx = drawingContext;
        this.drawingBrush.draw({ x: screenX, y: screenY }, brush);
        this.texture.needsUpdate = true;

    }
}
export default CubeMapDrawingTexture;
