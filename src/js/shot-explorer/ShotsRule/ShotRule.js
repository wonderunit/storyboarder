class ShotRule {
    constructor(focusedCenter, camera) {
        this.focusedCenter = focusedCenter;
        this.camera = camera;
    }

    applyRule() {

    }

    destroy() {
        this.focusedCenter = null;
        this.camera = null;
    }
}
export default ShotRule