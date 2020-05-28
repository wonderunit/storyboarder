import Mesh from './Mesh'
class SimpleMesh extends Mesh {

    constructor(drawingCtx) {
        super(drawingCtx);
        this.drawingCtx.lineJoin = true;
    }

    draw(currentPos, mesh) {
        super.draw(currentPos);
        this.drawingCtx.strokeStyle = mesh.color;
        this.drawingCtx.lineWidth = mesh.size;
      
        this.drawingCtx.beginPath();
        this.drawingCtx.moveTo(this.prevPos.x, this.prevPos.y);
        this.drawingCtx.lineTo(currentPos.x, currentPos.y);

        this.drawingCtx.stroke();
        //this.drawingCtx.closePath();
        this.prevPos.x = currentPos.x;
        this.prevPos.y = currentPos.y;
    }
}

export default SimpleMesh