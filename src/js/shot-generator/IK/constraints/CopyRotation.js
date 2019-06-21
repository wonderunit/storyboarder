const IkConstraint = require( "./IkConstraint");
const THREE = require( "three");


// CopyRotation is rotation constraint which copy target
// rotation and applies to itself.
class CopyRotation extends IkConstraint
{
    constructor(poleChain, target)
    {
        super(poleChain);
        this.target = target;
        this.rotateX = false;
        this.rotateY = true;
        this.rotateZ = false;
    }

    applyConstraint(joint)
    {
        let direction = new THREE.Vector3().copy(joint._getDirection());
        let targetedJoint = this.target;
        if(this.rotateX)
        {
            joint.bone.rotation.x = targetedJoint.bone.rotation.x;
        }
        if(this.rotateY)
        {
            joint.bone.rotation.y = targetedJoint.bone.rotation.y;
        }
        if(this.rotateZ)
        {
            joint.bone.rotation.z = targetedJoint.bone.rotation.z;
        }
        joint.bone.updateMatrix();
        joint._setDirection(direction);
        this.applyInfluenceToJoint(joint);
    }
}
module.exports =  CopyRotation;
