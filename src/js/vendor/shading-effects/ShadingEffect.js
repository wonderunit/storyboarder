
import * as THREE from 'three'
import IconSprites from '../../shot-generator/components/IconsComponent/IconSprites';
class ShadingEffects {
    constructor(gl) {
        this.renderer = gl;
        this.materials = [];
        this.autoClear = this.renderer.autoClear;
        this.domElement = this.renderer.domElement;
        this.shadowMap = this.renderer.shadowMap;
        this.objectsFilter = (object) => {
            return object.type === "Sprite"
            || object.parent instanceof IconSprites 
            || object.parent.parent.userData.type !== "character" 
            && object.parent.userData.type !== "object"
            && object.parent.userData.type !== "environment" 
            && object.userData.type !== "attachable" 
        };
    }

    getPixelRatio() {

		return this.renderer.getPixelRatio();

	};

	setPixelRatio( value ) {

		this.renderer.setPixelRatio( value );

	};

	getSize( target ) {

		return this.renderer.getSize( target );

	};

    setSize( width, height, updateStyle ) {

		this.renderer.setSize( width, height, updateStyle );

	}

    getAllMaterials(scene) {    
        this.materials = []
        scene.traverse((object) => {
            if ( object._numInstances ) return;
            if ( object.material === undefined ) return;
            if ( object.userData.type === "instancedMesh" ) return;
            if ( this.objectsFilter(object) ) return
            if ( Array.isArray( object.material ) ) {

                for ( var i = 0, il = object.material.length; i < il; i ++ ) {
    
                    this.materials.push(object.material[ i ] );

                }
    
            } else {
                
                this.materials.push(object.material);
                
            }
        })
    }

    render(scene, camera) {
        this.getAllMaterials(scene);
    }
}

export default ShadingEffects;