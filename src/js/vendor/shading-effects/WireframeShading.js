
import ShadingEffect from "./ShadingEffect"

class WireframeShading extends ShadingEffect {

    constructor( renderer ){
        super(renderer);
        this.wireframeColor = new THREE.Color(0xed7014)
        this.defaultColor = new THREE.Color(0x000000)
        this.colors = {}
    }

    setWireframe( state ) {
        for(let i = 0; i < this.materials.length; i++) {
            let material = this.materials[i];
            material.wireframe = state;
            if(state) {
                this.colors[material.id] = {}
                this.colors[material.id].color = new THREE.Color().copy(material.color ? material.color : this.defaultColor)
                material.color.copy(this.wireframeColor)
            } else {
                material.color.copy(this.colors[material.id].color)
                this.colors[material.id].color = null
                delete this.colors[material.id]
            }
            material.needsUpdate = true;
        }
    }

    render( scene, camera ) {
        super.render(scene, camera);
        this.setWireframe(true);
        this.renderer.render(scene, camera);
        this.setWireframe(false);
    }
}

export default WireframeShading;