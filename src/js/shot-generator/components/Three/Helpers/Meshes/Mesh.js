class Mesh {
    constructor(drawingCtx) {
        this.drawingCtx = drawingCtx;
        this.resetMeshPos();
        this.defaultWidth = 500;
        this.defaultHeight = 500;
        this.percentageBasedSize = true;
        this.brushSize;
    }
    
    resetMeshPos() {
        this.prevPos = null
    }

    draw(currentPos, mesh) {
        if(!this.prevPos) {
            this.prevPos = {}
            this.prevPos.x = currentPos.x;
            this.prevPos.y = currentPos.y;
        }
        this.brushSize = mesh.size;
        let { width, height } =  this.drawingCtx.canvas;
        if(this.percentageBasedSize) {
            let smallerSide = width > height ? height : width;
            let sizePercent = mesh.size  / this.defaultHeight;
            this.brushSize = smallerSide * sizePercent;
        }
    }
}
export default Mesh
