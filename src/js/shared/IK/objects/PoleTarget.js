const THREE = require( "three");

class PoleTarget
{
    constructor()
    {
        let geometry = new THREE.BoxGeometry(0.1,0.1, 0.1);
        let material = new THREE.MeshBasicMaterial({color: 0xffff00});
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.name = "PoleTarget";
        this.mesh.userData.type = "poleTarget";
        this.poleOffset = null;
        this.initialOffset = null;
    }

    initialize(position)
    {
        this.mesh.position.copy(position);
    }

    set name(value)
    {
        this.mesh.name = value;
    }

}
module.exports = PoleTarget;
