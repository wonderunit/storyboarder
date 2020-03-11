const TransformControls = require( "../utils/TransformControls");
class ObjectRotationControl
{
    constructor(scene, camera, domElement, characterId)
    {
        this.control = new TransformControls(camera, domElement);
        this.control.rotationOnly = true;
        this.control.setMode('rotate');
        this.control.size = 0.2;
        this.control.userData.type = "objectControl";
        this.control.traverse(child => {
            child.userData.type = "objectControl";
        });
        this.object = null;
        this.scene = scene;
        this.control.characterId = characterId;
        this.isEnabled = false;
    }

    set IsEnabled(value) 
    {
        this.control.enabled = value
    }
    //#region Events
    onMouseDown = event => {this.object.isRotated = true;};
    onMouseUp = event => {this.updateCharacter(this.object.name, this.object.rotation); this.object.isRotated = false; this.object.isRotationChanged = true;};
    //#enderegion

    selectObject(object, hitmeshid)
    {
        if(this.object !== null)
        {
            this.control.detach();
        }
        else if (object)
        {
            this.scene.add(this.control);
            this.control.addToScene();
        }
        this.control.objectId = hitmeshid;
        this.control.attach(object);
        this.object = object;
        this.control.addEventListener("transformMouseDown", this.onMouseDown, false);
        this.control.addEventListener("transformMouseUp", this.onMouseUp, false);
    }

    setUpdateCharacter(updateCharacter)
    {
        this.updateCharacter = updateCharacter;
    }

    deselectObject()
    {
        this.control.detach();
        this.scene.remove(this.control);
        
        this.control.dispose();
        this.object = null;
        this.control.removeEventListener("transformMouseDown", this.onMouseDown);
        this.control.removeEventListener("transformMouseUp", this.onMouseUp);
    }

    setCamera(camera)
    {
        this.control.changeCamera(camera);
        this.control.updateMatrixWorld();
    }

    cleanUp()
    {
        this.deselectObject();
        this.control.cleanUp();
        this.control = null;
        this.scene = null;
    }
}
module.exports = ObjectRotationControl;