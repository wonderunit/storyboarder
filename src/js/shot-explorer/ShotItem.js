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


    toString() {
        return `${this.size}, ${this.angle} on ${this.character && this.character.userData.name}`;
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
