/**
 * Return the first index containing an *item* which is greater than *item*.
 * @arguments _(item)_
 * @example
 *  indexOfGreaterThan([10, 5, 77, 55, 12, 123], 70) // => 2
 * via mohayonao/subcollider
 */
const indexOfGreaterThan = (array, item) => {
    for (var i = 0, imax = array.length; i < imax; ++i) {
      if (array[i] > item) { return i }
    }
    return -1
}
/**
 * Returns the closest index of the value in the array (collection must be sorted).
 * @arguments _(item)_
 * @example
 *  indexIn([2, 3, 5, 6], 5.2) // => 2
 * via mohayonao/subcollider
 */
const indexIn = (array, item) => {
    var i, j = indexOfGreaterThan(array, item)
    if (j === -1) { return array.length - 1 }
    if (j ===  0) { return j }
    i = j - 1
    return ((item - array[i]) < (array[j] - item)) ? i : j
}

const mms = [12, 16, 18, 22, 24, 35, 50, 85, 100]

class ShotItem {
    constructor(angle = null, size = null, character = null, cameraRotation = null, renderImage = null) {
        this.angle = angle;
        this.size = size;
        this.character = character;
        this.renderImage = renderImage;
        this.cameraRotation = cameraRotation;
        this.subscribers = [];
        this.rule = null;
        this.camera = null;
    }

    setRenderImage(renderImage) {
        this.renderImage = renderImage
        for(let i = 0; i < this.subscribers.length; i++) {
            this.subscribers[i](this.renderImage)
        }
    }

    subscribe(fn) {
        this.subscribers.indexOf(fn) === -1 && this.subscribers.push(fn)
    }

    unsubscribe(fn) {
        let indexOf = this.subscribers.indexOf(fn)
        indexOf !== -1 && this.subscribers.splice(indexOf, 1)
    }
    
    toString(t) {
        if(!this.camera) return
        let focalLength = this.camera.getFocalLength()
        let index = indexIn(mms, focalLength)
        return `${this.size}, ${this.angle} ${t("shot-explorer.on")} ${this.character && this.character.userData.name}, ${mms[index]}mm`;
    }

    destroy() {
        this.angle = null;
        this.size = null;
        this.character = null;
        this.renderImage = null;
        this.cameraRotation = null;
        this.subscribers = [];
        this.rule && this.rule.destroy()
        this.rule = null;
        this.camera = null;
    }
}
export default ShotItem;
