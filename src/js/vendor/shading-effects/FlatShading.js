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
        this.lambertMaterials = {}
        this.originalMaterials = {}
    }

    cleanupCache() {
        super.cleanupCache();
        let lambertMaterials = Object.keys(this.lambertMaterials);
        for ( var i = 0, il = lambertMaterials.length; i < il; i ++ ) {
            let lambertMaterial = this.lambertMaterials[lambertMaterials[i]];
            lambertMaterial.dispose();
            this.lambertMaterials[lambertMaterials[i]] = undefined;
        }
        this.lambertMaterials = undefined;
        this.originalMaterials = undefined;
    }

    getShaderMaterial( material ) {
        if(!this.lambertMaterials[material.uuid]) {
            let lambertMaterial = new THREE.MeshPhongMaterial(
                { 
                    shininess: 0,
                    roughness: 1,
                    metalness: 0,
                    depthTest: true,
                    depthWrite: true,
                    flatShading: true,
                    side: THREE.FrontSide,
                });
            this.lambertMaterials[material.uuid] = lambertMaterial;

            this.originalMaterials[lambertMaterial.uuid] = material;
        }

        this.lambertMaterials[material.uuid].skinning = material.skinning;
        this.lambertMaterials[material.uuid].morphTargets = material.morphTargets;
        this.lambertMaterials[material.uuid].morphNormals = material.morphNormals;
        this.lambertMaterials[material.uuid].fog = material.fog;
        this.lambertMaterials[material.uuid].map = material.map;
        this.lambertMaterials[material.uuid].needsUpdate = true;
        return this.lambertMaterials[material.uuid];
    }

    getOriginalMaterial( material ) {
        return this.originalMaterials[material.uuid];
    }

    setFlatShading( getMaterial ) {
        for(let i = 0; i < this.objects.length; i++) {
            let object = this.objects[i];
            if ( Array.isArray( object.material ) ) {
                for ( var j = 0, jl = object.material.length; j < jl; j ++ ) {
    
                    object.material[ j ] = getMaterial( object.material[ j] );
    
                }
    
            } else {
    
                let outlineMaterial = getMaterial( object.material );
                object.material = outlineMaterial;
                
            }   
        }
    }

    render( scene, camera ) {
        super.render(scene, camera)
        //this.setFlatShading((object) => this.getShaderMaterial(object));
        this.renderer.render(scene, camera);
        ///this.setFlatShading((object) => this.getOriginalMaterial(object));
    }
}

export default FlatShading;