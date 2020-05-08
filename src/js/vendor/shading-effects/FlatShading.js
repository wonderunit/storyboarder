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
    }

    setFlatShading( state ) {
        for(let i = 0; i < this.objects.length; i++) {

            let object = this.objects[i]
            if ( Array.isArray( object.material ) ) {

                for ( let j = 0, il = object.material.length; j < il; j ++ ) {
    
                    let material = object.material[j];
                   // material.flatShading = state;
                    material.needsUpdate = true;

                }
    
            } else {
                let material = object.material;
              //  material.flatShading = state;
                material.needsUpdate = true;
            }
        }
    }

    render( scene, camera ) {
        super.render(scene, camera)
       // this.setFlatShading(true);
        this.renderer.render(scene, camera);
       // this.setFlatShading(false);
    }
}

export default FlatShading;