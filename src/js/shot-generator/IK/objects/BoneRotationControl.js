const TransformControls = require( "../utils/TransformControls");
class BoneRotationControl
{
    constructor(scene, camera, domElement)
    {
        this.control = new TransformControls(camera, domElement);
        this.control.rotationOnly = true;
        this.control.setMode('rotate');
        this.control.size = 0.2;
        this.domElement = domElement;
        this.control.userData.type = "boneControl";
        this.bone = null;
        this.scene = scene;
    }
    //#region Events
    onMouseDown = event => {this.bone.isRotated = true;};
    onMouseMove = event => {this.updateCharacter(this.bone.name, this.bone.rotation);};
    onMouseUp = event => {this.bone.isRotated = true;};
    //#enderegion

    selectedBone(bone, hitmeshid)
    {
        if(this.bone !== null)
        {
            this.control.detach(bone);
        }
        else if (bone)
        {
            this.scene.add(this.control);
            this.control.addToScene();
        }
        this.control.boneId = hitmeshid;
        this.control.attach(bone);
        this.bone = bone;
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
        this.control.detach(bone);
        this.scene.remove(this.control);
        this.control.dispose();
        this.bone = null;
        this.control.removeEventListener("transformMouseDown", this.onMouseDown);
        this.control.removeEventListener("transformMoved", this.onMouseMove);
        this.control.removeEventListener("transformMouseUp", this.onMouseUp);
    }

    setCharacter(character)
    {
        this.control.characterId = character.uuid;
    }
}
module.exports = BoneRotationControl;
