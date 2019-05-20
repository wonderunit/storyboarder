import * as THREE from "three";

// IkConstraint is abstract class for custom constraints
// it's implemented in three-ik.js so it supposed to be added as
// constraint to joints
class IkConstraint
{
    constructor(poleChain)
    {
        if(new.target === IkConstraint)
        {
            throw new TypeError("Cannot construct abstract IkConstraint directly");
        }
        if(this.applyConstraint === undefined)
        {
            throw new TypeError("Must override method applyConstraint(joint)");
        }
        this.poleChain = poleChain;
        this.influence = 100;
        this.name = "DefaultConstraint";
    }

    set influence(value)
    {
        this._influence = value > 100 ? 100 : value < 0 ? 0 : value;
    }

    get influence()
    {
        return this._influence;
    }

    // Getting vector difference between two vector which is affected by influence
    blendBetweenVectorsByInfluence(v1, v2)
    {
        let difference = v2.clone().sub(v1);
        let influence =  this.influence / 100;
        let result = difference.multiplyScalar(influence);
        return result;
    }

    // Applies influence to joint
    // Influence is percentage variable which say how the direction of joint
    // Would be changed from starting position, so if influence 0 the limb will
    // stay in same position
    applyInfluenceToJoint(joint)
    {
        let direction = new THREE.Vector3().copy(joint._getDirection());
        let radius = direction.length();
        let originalDirection = joint._originalDirection.clone().negate();
        let blend = this.blendBetweenVectorsByInfluence(originalDirection, direction);
        originalDirection.add(blend);
        direction.setLength(radius);
        joint._setDirection(direction);
    }

}
module.exports =  IkConstraint;
