import Mesh from './Mesh'
class SimpleMesh extends Mesh {

    constructor(drawingCtx) {
        super(drawingCtx);
       // this.drawingCtx.lineJoin = true;
    }

    draw(currentPos, mesh) {
        super.draw(currentPos);
        this.drawingCtx.strokeStyle = mesh.color;
        this.drawingCtx.lineWidth = mesh.size;
      

        var circle = new Path2D();
        circle.moveTo(this.prevPos.x, this.prevPos.y );
        circle.arc(this.prevPos.x, this.prevPos.y, mesh.size / 2.1, 0, 2 * Math.PI);
        this.drawingCtx.fill(circle);
        this.drawingCtx.beginPath();
        this.drawingCtx.moveTo(this.prevPos.x, this.prevPos.y);
        this.drawingCtx.lineTo(currentPos.x, currentPos.y);

        this.drawingCtx.stroke();
        this.drawingCtx.closePath();

        circle.moveTo(currentPos.x, currentPos.y );
        circle.arc(currentPos.x, currentPos.y, mesh.size / 2.1, 0, 2 * Math.PI);
        this.drawingCtx.fill(circle);

        this.prevPos.x = currentPos.x;
        this.prevPos.y = currentPos.y;
    }
}

export default SimpleMesh