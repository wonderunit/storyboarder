import * as THREE from 'three'
import drawSetting from './drawSettings'
class DrawingTexture {
    constructor(){
        this.drawingCanvas = document.createElement('canvas');
        this.drawingCtx = this.drawingCanvas.getContext('2d');
        this.raycaster = new THREE.Raycaster();
        this.material = null;
        this.isEnabled = true;
        drawSetting.meshSize = 5;
        drawSetting.color = '#ff0000';

        this.prevX = null
        this.prevY = null
    }

    set Enabled(value) {
        this.isEnabled = value;
    }

    get Enabled() {
        return this.isEnabled;
    }

    createMaterial() {
        let texture = new THREE.CanvasTexture(this.drawingCanvas);
        let material = new THREE.MeshToonMaterial({ map: texture, transparent: true });
        material.needsUpdate = true;
        this.material = material;
        return material
    }

    setTexture(texture) {
        const { width, height } = texture.image;
        this.drawingCanvas.width = width;
        this.drawingCanvas.height = height;
        
        this.drawingCtx.drawImage(texture.image, 0, 0, width, height);
        this.material.map.needsUpdate = true;
    }    

    intersectImage (x, y, object, camera) {
      this.raycaster.setFromCamera({x,y}, camera);
      let intersects = this.raycaster.intersectObject(object, true);
      return intersects.length && intersects[0].uv;
    }
  
    draw (mousePosition, object, camera){
        if(!this.isEnabled) return;
 
        const { width, height } = this.material.map.image;
        let coordinates = this.intersectImage(mousePosition.x, mousePosition.y, object, camera);
        if(!coordinates) return;
        let screenX = coordinates.x * width;
        let screenY = ( 1 - coordinates.y) * height;
        this.drawingCtx.drawImage(this.material.map.image, 0, 0);
        this.drawingCtx.beginPath();
        this.drawingCtx.moveTo(this.prevX, this.prevY);
        this.drawingCtx.lineTo(screenX, screenY);
        this.drawingCtx.strokeStyle = drawSetting.color;
        this.drawingCtx.lineWidth = drawSetting.meshSize;
        this.drawingCtx.stroke();
        this.drawingCtx.closePath();
        this.material.map.needsUpdate = true;
        this.prevX = screenX
        this.prevY = screenY
    }
}
export default DrawingTexture;