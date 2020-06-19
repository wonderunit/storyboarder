class Brush {
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

    draw(currentPos, brush) {
        if(!this.prevPos) {
            this.prevPos = {}
            this.prevPos.x = currentPos.x;
            this.prevPos.y = currentPos.y;
        }
        this.brushSize = brush.size;
        let { width, height } =  this.drawingCtx.canvas;
        if(this.percentageBasedSize) {
            let smallerSide = width > height ? height : width;
            let sizePercent = brush.size  / this.defaultHeight;
            this.brushSize = smallerSide * sizePercent;
        }
    }
}
export default Brush
