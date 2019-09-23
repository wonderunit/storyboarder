const THREE = require("three");
const RagDoll = require("../three/IK/XrRagdoll");
const {createTransformationControls} = require("../../../shot-generator/IK/utils/axisUtils");
require('./GPUPickers/utils/Object3dExtension');
let instance = null;
let boneMatrix = new THREE.Matrix4();
class IKHelper extends THREE.Object3D
{
    constructor(mesh)
    {
        if(!instance)
        {
            super();
            instance = this;
            instance.controlPoints = {};
            this.selectedContolPoint = null;
            instance.ragDoll = new RagDoll();
            intializeInstancedMesh(mesh);
        }
        return instance;
    }

    static getInstance(mesh) 
    {
        return instance ? instance : new IKHelper(mesh)
    }

    initialize(skinnedMesh)
    {
        let bones = skinnedMesh.skeleton.bones;
        let originalInverseMatrix = bones[0].parent.getInverseMatrixWorld();
        let ragDoll = instance.ragDoll;
        for(let i = 0; i < bones.length; i++)
        {
            let bone = bones[i];
            if(bone.name === "LeftFoot" || bone.name === "RightFoot" ||
            bone.name === "LeftHand" || bone.name === "RightHand" ||
            bone.name === "Head" || bone.name === "Hips")
            {
                boneMatrix.multiplyMatrices( originalInverseMatrix, bone.matrixWorld );
                let controlPoint = this.controlPoints[bone.name];
                controlPoint.position.setFromMatrixPosition(boneMatrix);
                controlPoint.position.y -= 0.05;
                controlPoint.scale.set(0.5, 0.1, 0.5)
                controlPoint.userData.id = skinnedMesh.uuid;
                controlPoint.name = bone.name;
                
            }
        }
        console.log(skinnedMesh.parent.parent);
        ragDoll.initObject(this, skinnedMesh.parent.parent, Object.values(this.controlPoints));
    }

    selectControlPoint(name)
    {
        this.ragDoll.update();
        this.ragDoll.isEnabledIk = true;
        this.selectedControlPoint = this.controlPoints[name];
    }

    deselectControlPoint()
    {
        if(this.selectedControlPoint)
        {
            this.ragDoll.isEnabledIk = false;
            instance.attach(this.selectedControlPoint);
            this.selectedControlPoint = null;
        }
    }

    updateControlPoint(controlPoint)
    {
        //console.log(controlPoint)
    }

    update()
    {
        //this.ragDoll.update();
    }

    updateMatrixWorld(value)
    {
        super.updateMatrixWorld(value);
        this.ragDoll.update();
    }

    raycast(raycaster, intersects)
    {
        let values = Object.values(this.controlPoints);
        let results = raycaster.intersectObjects(values);
        for (let result of results)
        {
          //result.bone = this.helpingBonesRelation.find(object => object.helpingBone.id === result.object.id).originalBone;
          intersects.push(result);
        }
    }
}

const intializeInstancedMesh = (mesh) =>
{
    let instance = IKHelper.getInstance();
    let material = new THREE.MeshBasicMaterial({
        color: 0x008888,    
        depthTest: false,
        depthWrite: false,
        transparent: true,
        opacity: 0.5,
        flatShading: true});
    instance.material = material;
    instance.instancedControlPoints = new THREE.InstancedMesh(mesh.geometry, material, 6, true, true, false);
    instance.defaultPosition = new THREE.Vector3(5000, 5000, 5000);
    let listOfControlPoints = ["Head", "LeftHand", "RightHand", "LeftFoot", "RightFoot", "Hips"];
    for(let i = 0; i < 6; i++)
    {
        let controlPoint = new THREE.Mesh(mesh.geometry, material);
        instance.controlPoints[listOfControlPoints.shift()] = controlPoint;
        instance.add(controlPoint);
    }
    
}
module.exports = IKHelper;
