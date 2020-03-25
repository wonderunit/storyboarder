class ShotRule {
    constructor(box, camera) {
        this.box = box;
        this.camera = camera;
    }

    applyRule() {

    }

    destroy() {
        this.box = null;
        this.camera = null;
    }
}
export default ShotRule