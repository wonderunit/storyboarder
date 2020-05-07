
const VirtualCamera = require('../components/VirtualCamera')
class Mirror extends THREE.Object3D 
{
    constructor(gl, scene, fov, aspect, sizes) 
    {
        super();
        this.gl = gl;
        this.scene = scene;
        this.camera = new THREE.PerspectiveCamera(fov, (sizes.width / sizes.height), 0.01, 1000);
        this.camera.position.set(0, sizes.height / 2, 3)
        this.add(this.camera);
        const resolution = 1024;
        this.renderTarget = new THREE.WebGLRenderTarget(sizes.width * resolution, sizes.height * resolution);
        let material = new THREE.MeshBasicMaterial({
            map: this.renderTarget.texture,
            side: THREE.FrontSide
        });
        let geometry = new THREE.PlaneGeometry(sizes.width, sizes.height);
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.y = sizes.height / 2;
        this.mesh.rotation.set(0, Math.PI, 0);
        this.mesh.scale.set(-1, 1, 1);
        this.name = "Mirror";
        this.camera.layers.set(VirtualCamera.VIRTUAL_CAMERA_LAYER);
        this.add(this.mesh);
    }

    updateMatrixWorld(force)
    {
        super.updateMatrixWorld(force);
        this.renderMirror();
    }

    renderMirror()
    {
        let gl = this.gl;
        this.scene.remove(this);
        gl.xr.enabled = false
        this.scene.autoUpdate = false;
        gl.setRenderTarget(this.renderTarget);
        gl.render(this.scene, this.camera);
        gl.setRenderTarget(null);
        this.mesh.material.map = this.renderTarget.texture;
        this.mesh.material.needsUpdate = true;
        this.scene.attach(this);
        this.scene.autoUpdate = true;
        gl.xr.enabled = true
    }
}
module.exports = Mirror;
