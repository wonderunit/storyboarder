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
        drawSetting.color = '#000000';

        this.prevX = null;
        this.prevY = null;
        this.uvBased = false;
    }

    set Enabled(value) {
        this.isEnabled = value;
    }

    get Enabled() {
        return this.isEnabled;
    }

    resetMeshPos() {
        this.prevX = null
        this.prevY = null
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
        if(this.uvBased) return intersects.length && intersects[0].uv
        let percentage = null
        if(intersects.length && intersects[0]) {
            let scale = object.scale.clone()//new THREE.Vector3();
            scale.z = 0;
            scale.y = -scale.y
            let quaternion = object.worldQuaternion()
            scale.applyQuaternion(quaternion)
            scale.divideScalar(2)
            let intersectPos = intersects[0].point
            let position = object.worldPosition()//.applyEuler(euler)
            let topPosition = position.clone().sub(scale)
            let bottomPosition = position.clone().add(scale)
            quaternion.inverse()
            bottomPosition.applyQuaternion(quaternion)
            topPosition.applyQuaternion(quaternion)
            intersectPos.applyQuaternion(quaternion)
            bottomPosition.sub(topPosition)
            intersectPos.sub(topPosition)
            intersectPos.divide(bottomPosition)
            percentage = {}
            percentage.x = intersectPos.x
            percentage.y = intersectPos.y
            percentage.z = intersectPos.z
        }
        return percentage;
    }
  
    draw (mousePosition, object, camera){
        if(!this.isEnabled) return;
 
        const { width, height } = this.material.map.image;
        let percentage = this.intersectImage(mousePosition.x, mousePosition.y, object, camera);
        if(percentage === null) {
            this.resetMeshPos();
            return;
        }
        let screenX = this.uvBased ?  percentage.x * width : width * percentage.x;
        let screenY = this.uvBased ?  ( 1 - percentage.y) * height : height * percentage.y;
        if(!this.prevX || !this.prevY) {
            this.prevX = screenX;
            this.prevY = screenY;
        }
   
        this.drawingCtx.drawImage(this.material.map.image, 0, 0);
        this.drawingCtx.beginPath();
        this.drawingCtx.moveTo(this.prevX, this.prevY);
        this.drawingCtx.lineTo(screenX, screenY);
        this.drawingCtx.strokeStyle = drawSetting.color;
        this.drawingCtx.lineWidth = drawSetting.meshSize;
        this.drawingCtx.stroke();
        this.drawingCtx.closePath();
        this.material.map.needsUpdate = true;
        this.prevX = screenX;
        this.prevY = screenY;
    }
}
export default DrawingTexture;