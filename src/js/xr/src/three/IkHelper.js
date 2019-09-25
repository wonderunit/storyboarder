const THREE = require("three");
const RagDoll = require("../three/IK/XrRagdoll");
require('./GPUPickers/utils/Object3dExtension');
let instance = null;
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
            this.poleTargets = new THREE.Group();
            this.add(this.poleTargets);
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
        let ragDoll = instance.ragDoll;
        let controlPointsValues = Object.values(this.controlPoints);
        let meshes = this.poleTargets.children.concat(controlPointsValues);
        for(let i = 0; i < meshes.length; i++)
        {
            let mesh = meshes[i];
            mesh.scale.set(0.5, 0.1, 0.5)
            mesh.userData.id = skinnedMesh.uuid;
        }
        ragDoll.initObject(this, skinnedMesh.parent.parent, controlPointsValues, this.poleTargets.children);
        ragDoll.reinitialize();
    }

    selectControlPoint(name)
    {
        this.ragDoll.isEnabledIk = true;
        this.selectedControlPoint = this.controlPoints[name];
        console.log(this.selectedControlPoint.clone());
        if(name === "Hips")
        {
            this.ragDoll.hipsMouseDown = true;
        }
    }

    deselectControlPoint()
    {
        if(this.selectedControlPoint)
        {  
            console.log(this.selectedControlPoint.clone());
            this.ragDoll.isEnabledIk = false;
            instance.attach(this.selectedControlPoint);
            if(this.selectedControlPoint.name === "Hips")
            {
                this.ragDoll.hipsMouseDown = false;
            }
            this.selectedControlPoint = null;
        }
    }

    updateControlPoint(controlPoint)
    {
        //console.log(controlPoint)
    }

    update()
    {
    
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
        controlPoint.name = listOfControlPoints.shift();
        instance.controlPoints[controlPoint.name] = controlPoint;
        instance.add(controlPoint);
    }
    let listOfControlTargets = ["leftArmPole", "rightArmPole", "leftLegPole", "rightLegPole"];
    for(let i = 0; i < 4; i++)
    {
        let poleTarget = new THREE.Mesh(mesh.geometry, material);
        poleTarget.name = listOfControlTargets.shift();
        instance.poleTargets.add(poleTarget);
    }
    
}
module.exports = IKHelper;
