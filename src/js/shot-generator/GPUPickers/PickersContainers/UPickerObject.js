const Pickable = require("./Pickable");
class UPickerObject extends Pickable
{
    constructor(sceneObject)
    {
        super(sceneObject);
        this.sceneMesh = null;
        this.getMeshFromSceneObject();
    }
    
    getMeshFromSceneObject()
    {
        this.sceneMesh = this.sceneObject.children.find(child => child.type === "Mesh")
    }

    initialize(id)
    {
        super.initialize(id);
        this.pickingMaterial = new THREE.MeshPhongMaterial({
            emissive: new THREE.Color(id),
            color: new THREE.Color(0, 0, 0),
            specular: 0x0,
            shininess: 0,
          });
        this.pickingCube = new THREE.Mesh(this.sceneMesh.geometry, this.pickingMaterial);
        this.node.type = "object";
        this.node.add(this.pickingCube);
        console.log(this.node);
        this.node.pickerId = id;
        this.pickingCube.pickerId = id;
        //TODO(): Remove when XRGPUPIcker changed
        this.node.pickingContainer = this;
        //ToDO(): Find a better way to remove deleted objects
        this.needsRemoval = false;
    }

    update()
    {
        if(this.isSceneObjectRemoved())
        {
            this.needsRemoval = true;
            return;
        }
        this.node.position.copy(this.sceneMesh.worldPosition());
        this.node.quaternion.copy(this.sceneMesh.worldQuaternion());
        this.node.scale.copy(this.sceneMesh.worldScale());
    }

}
module.exports = UPickerObject;
