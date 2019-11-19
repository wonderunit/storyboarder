const TransformControls = require( "../utils/TransformControls");
class BoneRotationControl
{
    constructor(scene, camera, domElement, characterId)
    {
        this.control = new TransformControls(camera, domElement);
        this.control.rotationOnly = true;
        this.control.setMode('rotate');
        this.control.size = 0.2;
        this.domElement = domElement;
        this.control.userData.type = "boneControl";
        this.control.traverse(child => {
            child.userData.type = "boneControl";
        });
        this.bone = null;
        this.scene = scene;
        this.control.characterId = characterId;
    }
    //#region Events
    onMouseDown = event => {this.control.bone.isRotated = true;};
    onMouseMove = event => {this.updateCharacter(this.control.bone.name, this.control.bone.rotation);};
    onMouseUp = event => {this.control.bone.isRotated = false; this.control.bone.isRotationChanged = true;};
    //#enderegion

    selectedBone(bone, hitmeshid)
    {
        if(this.control.bone)
        {
            console.log("Was already on scene")
            this.control.detach();
        }
        else if (bone)
        {
            console.log("Added to scene")
            this.scene.add(this.control);
            this.control.addToScene();
        }
        this.control.boneId = hitmeshid;
        this.control.attach(bone);
        this.control.bone = bone;
        this.control.addEventListener("transformMouseDown", this.onMouseDown, false);
        this.control.addEventListener("transformMoved", this.onMouseMove, false);
        this.control.addEventListener("transformMouseUp", this.onMouseUp, false);
    }

    setUpdateCharacter(updateCharacter)
    {
        this.updateCharacter = updateCharacter;
    }

    deselectBone()
    {
        this.control.detach();
        this.scene.remove(this.control);
        
        this.control.dispose();
        this.control.bone = null;
        this.control.removeEventListener("transformMouseDown", this.onMouseDown);
        this.control.removeEventListener("transformMoved", this.onMouseMove);
        this.control.removeEventListener("transformMouseUp", this.onMouseUp);
    }

    setCamera(camera)
    {
        this.control.changeCamera(camera);
        this.control.updateMatrixWorld();
    }
}
module.exports = BoneRotationControl;
