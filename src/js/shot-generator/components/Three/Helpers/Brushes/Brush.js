import PointBuffer from './PointBuffer'
class Brush {
    constructor(drawingCtx) {
        this.drawingCtx = drawingCtx;
        this.resetMeshPos();
        this.defaultWidth = 500;
        this.defaultHeight = 500;
        this.percentageBasedSize = true;
        this.brushSize;
        this.positionBuffer = new PointBuffer(2);
        this.isDrawing = false;
    }

    startDrawing() {
        this.isDrawing = true;
    }

    stopDrawing() {
        this.isDrawing = false;
        this.positionBuffer.flushArray();
    }
    
    set DrawingContext(value) {
        this.drawingCtx = value;
    }

    resetMeshPos() {
        this.prevPos = null;
    }

    cleanUp() {
        this.positionBuffer.flushArray();
        this.positionBuffer = null;
        this.drawingCtx = null;
        this.resetMeshPos()
    }

    draw(brush) {
        this.brushSize = brush.size;
        let { width, height } = this.drawingCtx.canvas;
        if(this.percentageBasedSize) {
            let smallerSide = width > height ? height : width;
            let sizePercent = brush.size  / this.defaultHeight;
            this.brushSize = smallerSide * sizePercent;
        }
    }
}
export default Brush;
