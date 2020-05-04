import ShadingEffect from "./ShadingEffect"
import IconSprites from '../../shot-generator/components/IconsComponent/IconSprites';
class FlatShading extends ShadingEffect {

    constructor( renderer ){
        super(renderer)
        this.objectsFilter = (object) => {
            return object.type === "Sprite"
            || object.parent instanceof IconSprites 
            || object.parent.parent.userData.type !== "character" 
            && object.parent.userData.type !== "object"
            && object.parent.userData.type !== "environment" 
            && object.userData.type !== "attachable" 
            && object.userData.type !== 'image'
        }
        this.depthMaterial = new THREE.MeshDepthMaterial(
            { 
                depthTest: true,
                depthWrite: true,
                depthPacking: THREE.RGBADepthPacking,
                side: THREE.FrontSide,
                blending: THREE.NoBlending
            });
    }

    setFlatShading( state ) {
        for(let i = 0; i < this.materials.length; i++) {
            let material = this.materials[i];
            material.flatShading = state;
            material.needsUpdate = true;

        }
    }

    render( scene, camera ) {
        super.render(scene, camera)
        this.setFlatShading(true);
        this.renderer.render(scene, camera);
        this.setFlatShading(false);
    }
}

export default FlatShading;