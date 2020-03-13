class ShotItem {
    constructor(angle = null, size = null, character = null, cameraRotation = null, renderImage = null) {
        this.angle = angle;
        this.size = size;
        this.character = character;
        this.renderImage = renderImage;
        this.cameraRotation = cameraRotation;
    }

    toString() {
        return `${this.size}, ${this.angle} on ${this.character.userData.name}`;
    }
}
export default ShotItem;
