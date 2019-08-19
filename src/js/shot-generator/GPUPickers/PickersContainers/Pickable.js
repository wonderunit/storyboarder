const THREE = require( "three");
require("../../IK/utils/Object3dExtension");
class Pickable
{
    constructor(object)
    {
        if(new.target === Pickable)
        {
            throw new TypeError("Cannot construct abstract Pickable directly");
        }

        if(this.update === undefined)
        {
            throw new TypeError("Must override method update()");
        }
        this.sceneObject = object;
        this.pickingMaterial = null;
        this.pickingMesh = null;
        this.sceneMesh = null;
        this.node = new THREE.Group();
    }

    initialize(id)
    {
        return this.pickingMaterial = new THREE.MeshPhongMaterial({
            emissive: new THREE.Color(id),
            color: new THREE.Color(0, 0, 0),
            specular: 0x0,
            shininess: 0,
            flatShading: true,
          });
          
    }

    isSceneObjectRemoved()
    {
        return this.sceneObject ? false : true;
    }

    getUUID()
    {
        return this.sceneObject.uuid;
    }

    dispose()
    {
        this.pickingMaterial.dispose();
    }

    isObjectChanged()
    {
        return false;
    }

    applyObjectChanges()
    {
    }
}
module.exports = Pickable;
