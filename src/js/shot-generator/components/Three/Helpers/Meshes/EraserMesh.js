import Mesh from './Mesh'
class EraserMesh extends Mesh {
    constructor(drawingCtx) {
        super(drawingCtx);
    }

    draw(currentPos, mesh) {
        super.draw(currentPos);
        this.drawingCtx.fillStyle = 'white';

        let circle = new Path2D();
        let xOffset = currentPos.x - this.prevPos.x;
        let yOffset = currentPos.y - this.prevPos.y;
        let length
        if(Math.abs(xOffset) < Math.abs(yOffset)) {
            length = Math.abs(yOffset)
          
        } else  {
            length = Math.abs(xOffset)
        }
        xOffset /= length;
        yOffset /= length;
        let size = mesh.size
        for(let i = 0; i < length; i++) {
            let x = xOffset * i;
            let y = yOffset * i;
            circle.moveTo(this.prevPos.x + x, this.prevPos.y + x);
            circle.arc(this.prevPos.x + x - size , this.prevPos.y + y - size, size, 0, 2 * Math.PI)    
        }
        this.drawingCtx.stroke();
        this.drawingCtx.fill(circle)
        this.prevPos.x = currentPos.x;
        this.prevPos.y = currentPos.y;
    }
}

export default EraserMesh;