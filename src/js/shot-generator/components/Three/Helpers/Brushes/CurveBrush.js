import Brush from './Brush'
const getVector2FromBuffer = (buffer, index) => {
    let elements = buffer.getElements(index);
    return { x:elements[0], y:elements[1] };
}

const getRangeVector2FromBuffer = (buffer, from, to) => {
    let points = [];
    for(let i = from; i < to; i ++) {
        let elements = buffer.getElements(i);
        points.push(elements);
    }

    return points;
}

const getMatrix = (arr) => {
    return arr.map(p => {
        if(p !== undefined) { return { x: p[0], y: p[1] }}
    })
}

class CurveBrush extends Brush {

    constructor(drawingCtx) {
        super(drawingCtx);
    }

    draw(currentPos, brush) {
        super.draw(brush);

        this.drawingCtx.strokeStyle = brush.color;
        this.drawingCtx.fillStyle = brush.color;
        this.drawingCtx.lineWidth = this.brushSize * 2;
        this.positionBuffer.addElements(currentPos);
        this.drawingCtx.beginPath()

        if(this.positionBuffer.currentLength > 3)
        {
            let multiplier = 12
            let tension = 0.5 * multiplier
            const pointList = [...getRangeVector2FromBuffer(this.positionBuffer, this.positionBuffer.getLength() - 3, this.positionBuffer.getLength() )]
            const floats = pointList.map(x => x.map( x => parseFloat(x)))
            this.drawingCtx.moveTo(floats[0][0], floats[0][1])
            const matrixPoints = floats.map((point, i, arr) => {
                if(i == 0) {
                    return getMatrix([arr[i], arr[i], arr[i+1], arr[i+2]])
                } else if(i === arr.length - 2) {
                    return getMatrix([arr[i - 1], arr[i], arr[i+1], arr[i+1]])
                } else {
                    return getMatrix([arr[i-1], arr[i], arr[i+1], arr[i+2]])
                }
            }).filter(mx => mx[3] !== undefined)

            const matrixMathToBezier = matrixPoints.map( p => {
                return [
                    { x: p[1].x, y: p[1].y },
                    { x: (-p[0].x + tension * p[1].x + p[2].x) / tension, y: (-p[0].y + tension * p[1].y + p[2].y) / tension },
                    { x: (p[1].x + tension * p[2].x - p[3].x) / tension, y: (p[1].y + tension * p[2].y - p[3].y) / tension },
                    { x: p[2].x, y: p[2].y }
                ]
            })
            for(let i = 0; i < matrixMathToBezier.length; i ++) {
                let bp = matrixMathToBezier[i]
                this.drawingCtx.bezierCurveTo(bp[1].x, bp[1].y, bp[2].x, bp[2].y, bp[3].x, bp[3].y)
            }

            this.positionBuffer.setElements(Object.values(matrixMathToBezier[0][1]), this.positionBuffer.getLength() - 3)
            this.positionBuffer.setElements(Object.values(matrixMathToBezier[0][2]), this.positionBuffer.getLength() - 2)
            this.positionBuffer.setElements(Object.values(matrixMathToBezier[0][2]), this.positionBuffer.getLength() - 1)

    } else {
        this.drawingCtx.moveTo(floats[0][0], floats[0][1])
    }
    this.drawingCtx.stroke();

    }
}

export default CurveBrush;