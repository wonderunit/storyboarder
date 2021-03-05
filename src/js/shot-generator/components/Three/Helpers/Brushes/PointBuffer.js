const parseElements = (elements) => {
    return elements.flatMap(p => Object.values(p).map(s => s))
}

class PointBuffer {
    constructor(pointsAmount) {
        this.defaultBufferSize = 20;
        this.pointsAmount = pointsAmount;
        this.flushArray();
    }
    
    addElements(...elements) {
        let parsedElements = parseElements(elements)
        let predictedLength = this.currentLength * this.pointsAmount + parsedElements.length;
        if(this.buffer.length < predictedLength) {

            let newLength = this.buffer.length * 2;
            while(newLength < predictedLength) {
                newLength *= 2;
            }
            let resizedBuffer = new Int16Array(newLength);
            resizedBuffer.set(this.buffer);
            this.buffer = resizedBuffer;
        }
        this.buffer.set(parsedElements, this.currentLength * this.pointsAmount);
        this.currentLength += parsedElements.length / this.pointsAmount;
    }

    setElements(elements, index) {
        let parsedElements = parseElements(elements)
        if(index + parsedElements.length > this.currentLength) return
        this.buffer.set(parsedElements, index);
    }

    getElements(index) {
        let offsetIndex = index * this.pointsAmount;
        return this.buffer.subarray(offsetIndex, offsetIndex + this.pointsAmount);
    }

    flushArray() {
        this.buffer = new Int16Array(this.defaultBufferSize * this.pointsAmount);
        this.currentLength = 0;
    }

    getLength() {
        return this.currentLength;
    }
}

export default PointBuffer;