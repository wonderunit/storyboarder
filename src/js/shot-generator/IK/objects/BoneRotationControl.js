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
    onMouseMove = event => {this.bone.isRotated = true; this.updateCharacter(this.bone.name, this.bone.rotation);};
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
        this.control.addEventListener("pointerup", this.onMouseMove, false);
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
        this.control.removeEventListener("pointerup", this.onMouseMove);
    }

    setCharacter(character)
    {
        this.control.characterId = character.uuid;
    }
}
module.exports = BoneRotationControl;
