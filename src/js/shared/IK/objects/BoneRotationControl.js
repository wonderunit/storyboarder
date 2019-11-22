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
        this.isEnabled = false;
        //this.isSelected = false;
    }
    //#region Events
    onMouseDown = event => {this.bone.isRotated = true;};
    onMouseMove = event => {this.updateCharacter(this.bone.name, this.bone.rotation);};
    onMouseUp = event => {this.bone.isRotated = false; this.bone.isRotationChanged = true;};
    //#enderegion

    selectedBone(bone, hitmeshid)
    {
        if(this.bone !== null)
        {
            this.control.detach();
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
       // this.domElement.addEventListener('keydown', this.keyDownEvent, false)
       // this.isSelected = true
    }

    setUpdateCharacter(updateCharacter)
    {
        this.updateCharacter = updateCharacter;
    }

    deselectBone()
    {
        //this.isSelected = false;
        this.control.detach();
        this.scene.remove(this.control);
        
        this.control.dispose();
        this.bone = null;
        this.control.removeEventListener("transformMouseDown", this.onMouseDown);
        this.control.removeEventListener("transformMoved", this.onMouseMove);
        this.control.removeEventListener("transformMouseUp", this.onMouseUp);
       // this.domElement.removeEventListener('keydown', this.keyDownEvent, false)
    }

    setCamera(camera)
    {
        this.control.changeCamera(camera);
        this.control.updateMatrixWorld();
    }

    disable() {
        console.log("Disabled")
        if(!this.bone && !this.isEnabled) return 
        console.log("Disabled")
        this.control.detach();
        this.scene.remove(this.control);
        this.isEnabled = false;
    }

    enable() {
        console.log("Enabled")
        if(!this.bone && this.isEnabled) return
        console.log("Enabled")
        this.scene.add(this.control);
        this.control.addToScene();
        this.control.attach(this.bone);
        this.control.updateMatrixWorld(true)

   /*      if(this.isSelected ) {
    
        } else {
            this.selectedBone(bone, hitmeshid)
            
        } */

        this.isEnabled = true;
     
    }
/* 
    keyDownEvent = (event) => { this.switchManipulationState(event)}

    switchManipulationState(event) {
      console.log("Changed state")
      if(event.ctrlKey )
      {
          if(event.key === 'r')
          {
              event.stopPropagation()
             // let isRotation = !container.current.userData.isRotationEnabled
             // container.current.userData.isRotationEnabled = isRotation
              if(isRotation) {
               // boneRotationControl.current.enable()
              } else {
               // boneRotationControl.current.disable()
              }
          }
      } 
    } */
}
module.exports = BoneRotationControl;