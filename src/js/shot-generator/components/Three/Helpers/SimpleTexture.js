import * as THREE from 'three'
import DrawingTexture from './DrawingTexture'

const fromWorldSpaceToClipSpace = (position, camera, gl) => {
    let rect = gl.domElement.getBoundingClientRect()
    let width = rect.width, height = rect.height;
    let widthHalf = width / 2, heightHalf = height / 2;

    //let vector = new THREE.Vector3();
   // let projector = new THREE.Projector();
    position.project(camera);
  //  projector.projectVector( vector.setFromMatrixPosition( position ), camera );

    position.x = ( position.x * widthHalf ) + widthHalf;
    position.y = - ( position.y * heightHalf ) + heightHalf;
    return position
} 

const fromClipSpaceToWorldSpace = (mousePos, camera, targetZ) => {
    let vector = new THREE.Vector3();
    vector.set(mousePos.x, mousePos.y, 0.5);
    vector.unproject(camera);
    vector.sub(camera.position).normalize();
    let distance = (targetZ - camera.position.z) / vector.z;
    let position = new THREE.Vector3().copy(camera.position).add(vector.multiplyScalar(distance));
    return position;
}
const fromClipSpaceToScreenSpace = (mousePos, gl) => {
    let rect = gl.domElement.getBoundingClientRect()
    let x = (mousePos.x + 1) / 2 * rect.width
    let y = (-mousePos.y - 1) / 2 * rect.height
    return {x, y}
}

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

        let bgeometry = new THREE.BoxBufferGeometry(0.2, 0.2,  0.2)
        let material = new THREE.MeshBasicMaterial({color:"#00FF00"})
        this.topCornerBox = new THREE.Mesh(bgeometry, material)
        let nmaterial = new THREE.MeshBasicMaterial({color:"#0000FF"})
        this.bottomCornerBox = new THREE.Mesh(bgeometry, nmaterial)
        nmaterial = new THREE.MeshBasicMaterial({color:"#FF0000"})
        this.pointerBox = new THREE.Mesh(bgeometry, nmaterial)
        this.mousePrevPos = null
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
        this.prevImageX = null
        this.prevImageY = null
        this.mousePrevPos = null
        this.prevIntersection = null
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
      
/*            if(!this.mousePrevPos || !this.prevIntersection) return
           intersection = {uv:{}} */
           //intersection = super.draw(this.mousePrevPos, object, camera, brush)
           //if(!intersection) {
               // console.log("New intersection", intersection)
               //     this.mousePrevPos = null
               //     this.drawingBrush.stopDrawing()
               //     this.drawingBrush.startDrawing()
               //    return
               //}
               //let newPos = fromClipSpaceToWorldSpace(mousePosition, camera)
              // newPos.applyMatrix4(new THREE.Matrix4().getInverse(object.matrixWorld))
              let worldPos = fromClipSpaceToWorldSpace(mousePosition, camera, object.position.z)
/*               this.pointerBox.position.set(0, 0, 0)
              this.pointerBox.quaternion.set(0, 0, 0, 1)
              this.pointerBox.scale.set(0, 0, 0)
              this.pointerBox.updateMatrixWorld(true) */
              let matrixInverse = new THREE.Matrix4().getInverse(object.matrixWorld)
              //worldPos.applyMatrix4(matrixInverse)
              intersection = {}
  
              let geometry = object.getObjectByProperty("type", "Mesh").geometry;
              let box = new THREE.Box3().setFromObject(object)
              let rotation = new THREE.Euler(object.rotation.x, object.rotation.y, object.rotation.z); //object.rotation.clone()
              let rotationalMatrix = new THREE.Matrix4().makeRotationFromEuler(rotation)
              let target = new THREE.Vector3()
              //plane.projectPoint(worldPos,target)
             // console.log("target", target)
              //console.log("WorldPos", worldPos)
             // box.applyMatrix4(rotationalMatrix)
            //  box.max.applyEuler(rotation)
              //worldPos.applyEuler(rotation)
     /*          let scale = object.scale.clone()//new THREE.Vector3();
              //scale.z = 0;
  
              let quaternion = object.worldQuaternion()
            //  
           //   scale.divideScalar(2)
              let boundingBox = object.getObjectByProperty("type", "Mesh").geometry.boundingBox
              scale = boundingBox.max.clone()//.sub(boundingBox.min)
              // scale.applyQuaternion(quaternion.clone().inverse())
              let position = object.worldPosition()
              // console.log(position)
              //  scale.applyMatrix4(matrixInverse)
              let euler = new THREE.Euler().setFromQuaternion(quaternion.inverse(), "XYZ")
              scale.y = -scale.y
              scale.applyEuler(euler)
              //scale.divideScalar(2)
              console.log("scale", scale)
              let pos = new THREE.Vector3()
              let topPosition = pos.sub(scale).applyMatrix4(matrixInverse)
              let bottomPosition =  pos.add(scale).applyMatrix4(matrixInverse) */
     
  
   
              //new THREE.Matrix4().compose(object.position, new THREE.Quaternion(), object.scale)
  
  
   
   
              //worldPos.z = topPosition.z
              //topPosition.applyMatrix4(matrixInverse)
             // bottomPosition.applyMatrix4(matrixInverse)
            //worldPos.applyMatrix4()
    /*         console.log("Before quat", worldPos.clone())
            console.log("quat", quaternion.clone())
           // worldPos.applyQuaternion(quaternion)
            console.log("after quat", worldPos.clone())
              console.log("topPosition", topPosition.clone())
            //  console.log("topPosition", worldPos.clone())
              console.log("bottomPosition", bottomPosition.clone()) */
  
            /*   topPosition.copy(this.topCornerBox.worldPosition())
              bottomPosition.copy(this.bottomCornerBox.worldPosition()) */
  
         
              //worldPos.applyMatrix4(matrixInverse)
/*               bottomPosition.applyMatrix4(matrixInverse)
              topPosition.applyMatrix4(matrixInverse)
              console.log("WorldPos", worldPos.clone())
              console.log("bottomPosition", bottomPosition.clone())
              console.log("topPosition", topPosition.clone())
              console.log("this.bottomCornerBox", this.bottomCornerBox.clone())
              console.log("this.topCornerBox", this.topCornerBox.clone()) */
  
          /*     this.topCornerBox.position.set(topPosition.x, topPosition.y, topPosition.z)
              this.topCornerBox.updateMatrixWorld(true)
              this.bottomCornerBox.position.set(bottomPosition.x, bottomPosition.y, bottomPosition.z)
              this.bottomCornerBox.updateMatrixWorld(true) */
  

  
         
              intersection = {uv: {}}
              //intersection.uv.x = (worldPos.x - xOffset) / xSize
              //intersection.uv.y = (worldPos.y - yOffset) / ySize

              //worldTop.applyMatrix4(matrixInverse)
              //worldBottom.applyMatrix4(matrixInverse)
    
/*               let clonedObject = object.clone()
              clonedObject.applyQuaternion(clonedObject.worldQuaternion().inverse())
              clonedObject.updateMatrixWorld(true)
              let newMatrixInverse = new THREE.Matrix4().getInverse(clonedObject.matrixWorld)
              //
              //worldPos.z = topPosition.z
              console.log("Object world prev", worldPos.clone())
              topPosition.applyMatrix4(clonedObject.matrixWorld)
              bottomPosition.applyMatrix4(clonedObject.matrixWorld)
              //worldPos.applyMatrix4(clonedObject.matrixWorld) */

/*              this.topCornerBox.position.set(topPosition.x, topPosition.y, topPosition.z)
             this.topCornerBox.updateMatrixWorld(true)
             this.bottomCornerBox.position.set(bottomPosition.x, bottomPosition.y, bottomPosition.z)
             this.bottomCornerBox.updateMatrixWorld(true)

              object.parent.add(this.bottomCornerBox)
              object.parent.add(this.topCornerBox)
              this.pointerBox.position.set(worldPos.x, worldPos.y, worldPos.z)
              this.pointerBox.updateMatrixWorld(true)
              object.add(this.pointerBox)
              object.updateMatrixWorld(true)
              this.pointerBox.updateMatrixWorld(true)
              worldPos.copy(this.pointerBox.position)
              worldPos.applyMatrix4(object.matrixWorld)
              worldPos.applyQuaternion(clonedObject.worldQuaternion().inverse()) */
              //this.pointerBox.position.applyMatrix4(object.matrixWorld)
             // object.parent.add(this.pointerBox)
              //this.pointerBox.position.applyQuaternion(clonedObject.worldQuaternion().inverse())
              this.pointerBox.updateMatrixWorld(true)
             

             // worldPos.applyMatrix4(clonedObject.matrixWorld)
             //this.pointerBox.updateMatrixWorld(true)
             // this.pointerBox.applyMatrix4(matrixInverse)
             //this.pointerBox.applyMatrix4(clonedObject.matrixWorld)
             console.log(this.pointerBox.clone())
            // object.add(this.pointerBox)
            // this.pointerBox.position.set(worldPos.x, worldPos.y, worldPos.z)
             //worldPos.copy(this.pointerBox.worldPosition())
             //object.parent.add(this.pointerBox)
            // this.pointerBox.updateMatrixWorld(true)
            // this.pointerBox.position.applyMatrix4(object.matrixWorld)
            // this.pointerBox.position.applyMatrix4(clonedObject.matrixWorld)
            // this.pointerBox.updateMatrixWorld(true)
         
            // this.pointerBox.matrixWorld.decompose( this.pointerBox.position, this.pointerBox.quaternion, this.pointerBox.scale)
             //object.parent.add(this.pointerBox)
            // this.pointerBox.applyMatrix4(newMatrixInverse)
             // this.pointerBox.updateMatrixWorld(true)


/*               console.log("Object top", topPosition)
              console.log("Object bottom", bottomPosition)
              console.log("Object world new", worldPos)
              //console.log("worldPos", worldPos)
              let xSize = (topPosition.x - bottomPosition.x)
              let ySize = (topPosition.y - bottomPosition.y)
              let xOffset = ySize / 2;
              let yOffset = xSize / 2;
       
            
              bottomPosition.sub(topPosition)
              worldPos.sub(topPosition)
              worldPos.divide(bottomPosition)
              intersection.uv.x = worldPos.x
              intersection.uv.y = 1 - worldPos.y
    /*         if(bottomPosition.x > topPosition.x && bottomPosition.y < topPosition.y) {
         
            } else {
                topPosition.sub(bottomPosition)
                worldPos.sub(bottomPosition)
                worldPos.divide(topPosition)
                intersection.uv.x = 1 - worldPos.x
                intersection.uv.y = worldPos.y
            }
             */
            
              //console.log(intersection.uv) 
             // return 
              //return
  /*             bottomPosition.sub(topPosition)
              worldPos.sub(topPosition)
              worldPos.divide(bottomPosition) */
             // console.log(worldPos)
             // console.log("xOffset", xOffset, yOffset)


            //#region Clip space to world space method
                let scale = object.scale.clone()//new THREE.Vector3();
                scale.z = 0;
                scale.y = -scale.y
                let quaternion = object.worldQuaternion()
                scale.applyQuaternion(quaternion)
                scale.divideScalar(2)
                let intersectPos = worldPos.clone()
                let position = object.worldPosition()//.applyEuler(euler)
                let topPosition = position.clone().sub(scale)
                let bottomPosition = position.clone().add(scale)
/*                 console.log("topPosition", topPosition)
                console.log("bottomPosition", bottomPosition) */
                let top = fromWorldSpaceToClipSpace(topPosition, camera, gl)
                let bottom = fromWorldSpaceToClipSpace(bottomPosition, camera, gl)
/*                 console.log("top", top)
                console.log("bottom", bottom) */

                let topMouse = mouse(top, gl)
                let bottomMouse = mouse(bottom, gl)
                let worldMouse = mouse(worldPos, gl)
/*                 console.log("topMouse", topMouse) */
/*                 console.log("bottomMouse", bottomMouse) */
                let worldTop = fromClipSpaceToWorldSpace(topMouse, camera, object.position.z) 
                let worldBottom = fromClipSpaceToWorldSpace(bottomMouse, camera, object.position.z)
  /*               console.log("WorldTop", worldTop)
                console.log("worldBottom", worldBottom)
                console.log("worldPos", worldPos) */
                if(worldBottom.x > worldTop.x && worldBottom.y < worldTop.y) {
                    console.log("top is top")
                    worldBottom.sub(worldTop)
                    worldPos.sub(worldTop)
                    worldPos.divide(worldBottom)
                    intersection.uv.x = worldPos.x
                    intersection.uv.y = 1 - worldPos.y
                } else {
                    console.log("bottom is top")
                    worldTop.sub(worldBottom)
                    worldPos.sub(worldBottom)
                    worldPos.divide(worldTop)
                    intersection.uv.x = 1 - worldPos.x
                    intersection.uv.y = worldPos.y
                }
            //#endregion


/*             let rect = gl.domElement.getBoundingClientRect()
            let { x:prevScreenX, y:prevScreenY } = fromClipSpaceToScreenSpace(this.mousePrevPos, gl)
            let { x:screenX, y:screenY } = fromClipSpaceToScreenSpace(mousePosition, gl)
            let deltaX = screenX - prevScreenX
            let deltaY = screenY - prevScreenY
            deltaX = (deltaX * this.texture.image.width / rect.width) * 10
            deltaY = (deltaY * this.texture.image.height / rect.height) * 10
            console.log("_____X_____")
            console.log("prevScreenX", prevScreenX)
            console.log("screenX", screenX)
            console.log("deltaX", deltaX)
            console.log("this.prevImageX",this.prevImageX)
            console.log("_____X_____")
            console.log("_____Y_____")
            console.log("prevScreenY", prevScreenY)
            console.log("screenY", screenY)
            console.log("deltaY", deltaY)
            console.log("this.prevImageY",this.prevImageY)
            console.log("_____Y_____")
            console.log("prevIntersection.uv", this.prevIntersection)
           intersection.uv.x = (this.prevImageX + deltaX) / this.texture.image.width
           intersection.uv.y = 1 - ((this.prevImageY + deltaY) / this.texture.image.height)
          // intersection.uv.y = (this.prevIntersection.y * newPos.y) / this.mousePrevPos.y
           // intersection.uv = { x: -(worldPos.x + xOffset) / xSize, y: -(worldPos.y + yOffset) / ySize }
           console.log("intersection.uv", intersection.uv)
           console.log("this.mousePrevPos", this.mousePrevPos) */
        } 
        if(Number.isNaN(intersection.uv.x) || Number.isNaN(intersection.uv.y)) return
        let screenX = (intersection.uv.x) * this.texture.image.width;
        let screenY = (1 - intersection.uv.y) * this.texture.image.height;
        this.drawingBrush.draw({ x: screenX, y: screenY }, brush)
        
        this.texture.needsUpdate = true;
 /*        if(intersection.point) {
            this.prevImageX = screenX
            this.prevImageY = screenY
            this.mousePrevPos = mousePosition//fromClipSpaceToWorldSpace(mousePosition, camera)
           // this.mousePrevPos.applyMatrix4(new THREE.Matrix4().getInverse(object.matrixWorld))
            this.prevIntersection = { x: intersection.uv.x, y: intersection.uv.y }
        } else {
            this.endDraw();
            this.prepareToDraw();
        } */
    }
}
export default SimpleTexture;