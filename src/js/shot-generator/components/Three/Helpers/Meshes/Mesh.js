class Mesh {
    constructor(drawingCtx) {
        this.drawingCtx = drawingCtx;
        this.resetMeshPos();
    }
    
    resetMeshPos() {
        this.prevPos = null
    }

    draw(currentPos) {
        if(!this.prevPos) {
            this.prevPos = {}
            this.prevPos.x = currentPos.x;
            this.prevPos.y = currentPos.y;
        }
    }
}
export default Mesh
