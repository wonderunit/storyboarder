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
            this.controlPoints = new THREE.Group();
            this.selectedContolPoint = null;
            instance.ragDoll = new RagDoll();
            this.poleTargets = new THREE.Group();
            this.add(this.poleTargets);
            this.add(this.controlPoints);
            intializeInstancedMesh(mesh);
            this.targets = this.poleTargets.children.concat(this.controlPoints.children);
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
        let meshes = this.targets;
        for(let i = 0; i < meshes.length; i++)
        {
            let mesh = meshes[i];
            mesh.scale.set(0.5, 0.1, 0.5)
            mesh.userData.id = skinnedMesh.uuid;
        }
        ragDoll.initObject(this, skinnedMesh.parent.parent, this.controlPoints.children, this.poleTargets.children);
        ragDoll.reinitialize();
    }

    selectControlPoint(name)
    {
        let targets = this.poleTargets.children.concat(this.controlPoints.children);
        this.selectedControlPoint = targets.find(object => object.name === name);
        if(!this.selectControlPoint) return;
        this.ragDoll.isEnabledIk = true;
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
            if(this.selectedControlPoint.userData.type === "controlPoint")
            {
                this.controlPoints.attach(this.selectedControlPoint);
            }
            else
            {
                this.poleTargets.attach(this.selectedControlPoint);
            }
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
        let values = this.controlPoints.children.concat(this.poleTargets.children);
        let results = raycaster.intersectObjects(values);
        for (let result of results)
        {
          //result.bone = this.helpingBonesRelation.find(object => object.helpingBone.id === result.object.id).originalBone;
          intersects.push(result);
        }
    }

    resetTargetPoints(targetPoint)
    {
        targetPoints.position.copy(this.defaultPosition);
        targetPoints.rotation.set(0, 0, 0);
        targetPoints.quaternion.set(0, 0, 0, 0);
        targetPoints.scale.set(0, 0, 0);
        this.updateInstancedBone(targetPoints, this.defaultColor);
    }

    updateInstancedTargetPoint(targetPoint, color = null)
    {
        let id = targetPoint.userData.id;
        this.instancedMesh.setPositionAt( id , targetPoint.position );
        this.instancedMesh.setQuaternionAt( id , targetPoint.quaternion );
        this.instancedMesh.setScaleAt( id , targetPoint.scale );

        this.instancedMesh.needsUpdate("position");
        this.instancedMesh.needsUpdate("quaternion");
        this.instancedMesh.needsUpdate("scale");
    }
}

const intializeInstancedMesh = (mesh) =>
{
    let instance = IKHelper.getInstance();
    let listOfControlPoints = ["Head", "LeftHand", "RightHand", "LeftFoot", "RightFoot", "Hips"];
    let listOfControlTargets = ["leftArmPole", "rightArmPole", "leftLegPole", "rightLegPole"];
    let sizeOfTargets = listOfControlTargets.concat(listOfControlTargets).length;
    let material = new THREE.MeshBasicMaterial({
        color: 0x008888,    
        depthTest: false,
        depthWrite: false,
        transparent: true,
        opacity: 0.5,
        flatShading: true});
    instance.material = material;
    instance.instancedControlPoints = new THREE.InstancedMesh(mesh.geometry, material, sizeOfTargets, true, true, false);
    instance.defaultPosition = new THREE.Vector3(5000, 5000, 5000);
    for(let i = 0; i < 6; i++)
    {
        let controlPoint = new THREE.Mesh(mesh.geometry, material);
        controlPoint.userData.id = --sizeOfTargets;
        controlPoint.userData.type = "controlPoint";
        controlPoint.name = listOfControlPoints.shift();
        instance.controlPoints.add(controlPoint);
        //instance.add(controlPoint);
    }
    for(let i = 0; i < 4; i++)
    {
        let poleTarget = new THREE.Mesh(mesh.geometry, material);
        poleTarget.userData.id = --sizeOfTargets;
        poleTarget.userData.type = "poleTarget";
        poleTarget.name = listOfControlTargets.shift();
        instance.poleTargets.add(poleTarget);
    }
    
}
module.exports = IKHelper;
