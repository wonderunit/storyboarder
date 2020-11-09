
import ShadingEffect from "./ShadingEffect"
import { SHOT_LAYERS } from "../../shot-generator/utils/ShotLayers";
class WireframeShading extends ShadingEffect {

    constructor( renderer ){
        super(renderer);
        this.wireframeColor = new THREE.Color(0xcccccc);
        this.defaultColor = new THREE.Color(0x000000);
        this.colors = {};
        this.edgesCache = {};
    }

    cleanupCache() {
        super.cleanupCache();
        let edgesKeys = Object.keys(this.edgesCache)
        for ( var i = 0, il = edgesKeys.length; i < il; i ++ ) {
            let edgesObject =  this.edgesCache[edgesKeys[i]];
            edgesObject.geometry.dispose();
            edgesObject.material.dispose();
            this.edgesCache[edgesKeys[i]] = undefined;
        }
        this.edgesCache = undefined;
    }

    setWireframe( state ) {

        for(let i = 0; i < this.objects.length; i++) {
            let object = this.objects[i];
            if(state) {
                if(object.isSkinnedMesh) {
                    object.material.wireframe = state;
                    this.colors[object.uuid] = {};
                    this.colors[object.uuid].color = new THREE.Color().copy(object.material.color ? object.material.color : this.defaultColor);
                    object.material.color.copy(this.wireframeColor);
                } else  {
                    if(!this.edgesCache[object.uuid]) {
                        var edges = new THREE.EdgesGeometry( object.geometry );
                        var line = new THREE.LineSegments( edges, new THREE.LineBasicMaterial( { color: this.wireframeColor } ) );
                        line.position.copy(object.position);
                        line.quaternion.copy(object.quaternion);
                        line.scale.copy(object.scale);
                        line.updateMatrixWorld(true);
                        line.layers.enable(SHOT_LAYERS)
                        this.edgesCache[object.uuid] = line;
                    }
                    object.material.visible = !state;
                    object.parent.add( this.edgesCache[object.uuid] );
                }
            } else {
                if(object.isSkinnedMesh) {
                    object.material.wireframe = state;
                    object.material.color.copy(this.colors[object.uuid].color);
                    this.colors[object.uuid].color = null;
                    delete this.colors[object.uuid];
                } else {
                    object.material.visible = !state;
                    object.parent.remove( this.edgesCache[object.uuid] );
                }
            }
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