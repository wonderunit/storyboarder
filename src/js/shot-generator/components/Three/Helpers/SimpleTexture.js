import * as THREE from 'three'
import DrawingTexture from './DrawingTexture'
import fromWorldSpaceToClipSpace from "../../../utils/WorldSpaceToClipSpace"
import fromClipSpaceToWorldSpace from "../../../utils/ClipSpaceToWorldSpace"

const mouse = (position, gl) => {
    const rect = gl.domElement.getBoundingClientRect();
    let worldX = ( ( position.x ) / rect.width ) * 2 - 1;
    let worldY = - ( ( position.y ) / rect.height ) * 2 + 1;
    return { x: worldX, y: worldY }
  }

class SimpleTexture extends DrawingTexture {
    constructor(){
        super();
        this.material = null;
        let canvas = document.createElement('canvas');
        let ctx = canvas.getContext('2d');

        this.drawingCanvases.push(canvas);
        this.drawingCtxes.push(ctx);
    }

    getImage(mime) { 
        return super.getImage(mime)[0];

    }

    setMesh(type) {
        super.setMesh(type);
        if(this.drawingCtxes[0]) {
            this.drawingBrush.drawingCtx = this.drawingCtxes[0];
        }
    }

    endDraw() {
        super.endDraw()
    } 

    createMaterial(material) {
        super.createMaterial(material.map);
        
        let canvasTexture = new THREE.CanvasTexture(this.drawingCanvases[0]);
        this.texture = canvasTexture;
        material.map = canvasTexture;
        this.material = material;
        material.map.needsUpdate = true;
        material.needsUpdate = true;
        this.drawingBrush.drawingCtx = this.drawingCtxes[0];
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
  
    draw (mousePosition, object, camera, brush, gl){
        let intersection = super.draw(mousePosition, object, camera, brush)
        // If we don't have a uv coordinates and as a last resort we trying to translate mouse into object coordinate 
        // From object coordinate we can sort of simulate uv coordinate logic for plain object 
        // NOTE() : This won't work for any object except plain object( image object )

        if(!intersection)  {
            if(!this.isChanged) return
            let worldPos = fromClipSpaceToWorldSpace(mousePosition, camera, object.position.z)
            intersection = {uv: {}}
            //#region Clip space to world space method
            let scale = object.scale.clone()
            scale.z = 0;
            scale.y = -scale.y
            let quaternion = object.worldQuaternion()
            scale.applyQuaternion(quaternion)
            scale.divideScalar(2)
            let position = object.worldPosition()
            let topPosition = position.clone().sub(scale)
            let bottomPosition = position.clone().add(scale)
            let top = fromWorldSpaceToClipSpace(topPosition, camera, gl)
            let bottom = fromWorldSpaceToClipSpace(bottomPosition, camera, gl)
            let topMouse = mouse(top, gl)
            let bottomMouse = mouse(bottom, gl)
            let worldTop = fromClipSpaceToWorldSpace(topMouse, camera, object.position.z) 
            let worldBottom = fromClipSpaceToWorldSpace(bottomMouse, camera, object.position.z)
            if(worldBottom.x > worldTop.x && worldBottom.y < worldTop.y) {
                worldBottom.sub(worldTop)
                worldPos.sub(worldTop)
                worldPos.divide(worldBottom)
                intersection.uv.x = worldPos.x
                intersection.uv.y = 1 - worldPos.y
            } else {
                worldTop.sub(worldBottom)
                worldPos.sub(worldBottom)
                worldPos.divide(worldTop)
                intersection.uv.x = 1 - worldPos.x
                intersection.uv.y = worldPos.y
            }
            //#endregion
        } 
        if(Number.isNaN(intersection.uv.x) || Number.isNaN(intersection.uv.y)) return
        let screenX = (intersection.uv.x) * this.texture.image.width;
        let screenY = (1 - intersection.uv.y) * this.texture.image.height;
        this.drawingBrush.draw({ x: screenX, y: screenY }, brush)
        
        this.texture.needsUpdate = true;
    }
}
export default SimpleTexture;