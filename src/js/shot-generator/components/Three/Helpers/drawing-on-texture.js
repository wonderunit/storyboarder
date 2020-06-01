import * as THREE from 'three'
import drawSetting from './drawSettings'
import SimpleMesh from './Meshes/SimpleMesh';
import EraserMesh from './Meshes/EraserMesh';

class DrawingTexture {
    constructor(){
        this.drawingCanvas = document.createElement('canvas');
        this.drawingCtx = this.drawingCanvas.getContext('2d');
        this.raycaster = new THREE.Raycaster();
        this.material = null;
        drawSetting.meshSize = 5;
        drawSetting.color = '#000000';

        this.prevX = null;
        this.prevY = null;
        this.uvBased = true;
        this.drawingMesh = new EraserMesh(this.drawingCtx)
    }


    resetMeshPos() {
        this.drawingMesh.resetMeshPos()
    }

    setMesh(type) {
        switch(type) {
            case "Simple":
                this.drawingMesh = new SimpleMesh(this.drawingCtx)
                break;
            case "Eraser":
                this.drawingMesh = new EraserMesh(this.drawingCtx)
                break;
            default: 
                this.drawingMesh = new SimpleMesh(this.drawingCtx)
        }
    }

    getImage() {
        let mime = "images/jpeg";
        let imageData = this.drawingCanvas.toDataURL(mime)
        return imageData
    }

    createMaterial() {
        let texture = new THREE.CanvasTexture(this.drawingCanvas);
        let material = new THREE.MeshToonMaterial({ map: texture, transparent: true, side: THREE.DoubleSide });
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
            let scale = object.scale.clone()
            scale.z = 0;
            scale.y = -scale.y
            let quaternion = object.worldQuaternion()
            scale.applyQuaternion(quaternion)
            scale.divideScalar(2)
            let intersectPos = intersects[0].point
            let position = object.worldPosition()
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
  
    draw (mousePosition, object, camera, mesh){
 
        const { width, height } = this.material.map.image;
        let percentage = this.intersectImage(mousePosition.x, mousePosition.y, object, camera);
        if(percentage === null) {
            this.resetMeshPos();
            return;
        }
        let screenX = this.uvBased ?  percentage.x * width : width * percentage.x;
        let screenY = this.uvBased ?  ( 1 - percentage.y) * height : height * percentage.y;

        this.drawingMesh.draw({ x: screenX, y: screenY }, mesh)

        this.material.map.needsUpdate = true;
    }
}
export default DrawingTexture;