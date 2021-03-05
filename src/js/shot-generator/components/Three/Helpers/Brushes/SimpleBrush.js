import Brush from './Brush'
const midPointsBtw = (p1, p2) => {
    return {
        x: p1.x + (p2.x - p1.x) / 2,
        y: p1.y + (p2.y - p1.y) / 2 
    }
}

const getDifferenceTo = (from, to) => {
    return {x:from.x - to.x, y: from.y - to.y};
}
const getDistanceTo = (from, to) => {
    const diff = getDifferenceTo(from, to);
    return Math.sqrt(Math.pow(diff.x, 2) + Math.pow(diff.y, 2));
}

const getAngleTo = (from, to) => {
    const diff = getDifferenceTo(from, to);
    return Math.atan2(diff.y, diff.x);
}

const moveByAngle = (angle, distance, point) => {
    const angleRotated = angle + (Math.PI / 2);
    let x = point.x + (Math.sin(angleRotated) * distance);
    let y = point.y - (Math.cos(angleRotated) * distance);
    return {x, y};
}
const getVector2FromBuffer = (buffer, index) => {
    let elements = buffer.getElements(index);
    return { x:elements[0], y:elements[1] };
}
class SimpleBrush extends Brush {

    constructor(drawingCtx) {
        super(drawingCtx);
    }

    draw(currentPos, brush) {
        super.draw(brush);
        this.drawingCtx.strokeStyle = brush.color;
        this.drawingCtx.fillStyle = brush.color;
        this.drawingCtx.lineWidth = this.brushSize * 2;
        this.drawingCtx.lineJoin = this.drawingCtx.lineCap = 'round';
        let prevPos;
        if(this.positionBuffer.currentLength === 0) {
            prevPos = currentPos;
        } else {
            prevPos = getVector2FromBuffer(this.positionBuffer, this.positionBuffer.currentLength - 1);
        }
        if(this.positionBuffer.currentLength === 0) {
            this.positionBuffer.addElements(currentPos);
            return;
        }
        this.drawingCtx.moveTo(currentPos.x, currentPos.y);
        this.drawingCtx.beginPath();
        let distance = getDistanceTo(currentPos, prevPos);
        let angle = getAngleTo(currentPos, prevPos);
        let newPos = moveByAngle(angle, distance, prevPos);
        this.positionBuffer.addElements(newPos);
        let p1 = getVector2FromBuffer(this.positionBuffer, 0);
        let p2 = getVector2FromBuffer(this.positionBuffer, 1);
        for(let i = 1, length = this.positionBuffer.currentLength; i < length; i++) {
            let midpoint = midPointsBtw(p1, p2);
            this.drawingCtx.quadraticCurveTo(p1.x, p1.y, midpoint.x, midpoint.y);
            p1 = getVector2FromBuffer(this.positionBuffer, i);
            p2 = getVector2FromBuffer(this.positionBuffer, i+1);
        }
        this.drawingCtx.stroke();
    }
}

export default SimpleBrush;