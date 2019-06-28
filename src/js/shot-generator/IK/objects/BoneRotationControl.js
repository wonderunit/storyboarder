const TransformControls = require( "../utils/TransformControls");
class BoneRotationControl
{
    constructor(scene, camera, domElement)
    {
        this.control = new TransformControls(camera, domElement);
        this.control.rotationOnly = true;
        this.control.setMode('rotate');
        this.control.size = 0.2;
        this.control.userData.type = "boneControl";
        this.bone = null;
        this.scene = scene;
    }

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
    }

    deselectBone()
    {
        this.control.detach(bone);
        this.scene.remove(this.control);
        this.control.dispose();
        this.bone = null;
    }

    setCharacter(character)
    {
        this.control.characterId = character.uuid;
    }
}
module.exports = BoneRotationControl;
