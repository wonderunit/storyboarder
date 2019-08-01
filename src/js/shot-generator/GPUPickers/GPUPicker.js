const THREE = require('three');
const GPUPickerHelper = require("./GPUPickerHelper");
//const SkeletonUtilities = require("../../vendor/three/examples/js/utils/SkeletonUtils");
require("../IK/utils/Object3dExtension");
class GPUPicker
{
    constructor()
    {
        this.pickingScene = new THREE.Scene();
        this.pickingPosition = new THREE.Vector2();
        this.gpuPickerHelper = new GPUPickerHelper();
        this.pickingScene.background = new THREE.Color(0);
        this.isInitialized = false;
        this.childrenSetted = false;
        this.idBonus = 3000;
    }

    initialize(scene, renderer)
    {
        if(this.isInitialized )
        {
            return;
        }
        this.pickingScene.background = new THREE.Color(0);
        this.children = scene.children;
        this.renderer = renderer;
        this.isInitialized = true;
    }

    initalizeChildren(scene)
    {
        let objects = [];
        this.getAllSceneMeshes(scene, objects);

        for(let i = 0, n = objects.length; i < n; i++)
        {
            let object = objects[i];
            if(this.isObjectAdded(object))
            {
                continue;
            }
            const id = i + this.idBonus;
            object.parent.updateMatrixWorld(true);
            this.gpuPickerHelper.selectableObjects[id] = object;
            const pickingMaterial = new THREE.MeshToonMaterial({
                emissive: new THREE.Color(id),
                color: new THREE.Color(0, 0, 0),
                specular: 0x0,
                skinning: true,
                shininess: 0,
                flatShading: false,
                morphNormals: true,
                morphTargets: true
              });
            let pickingCube = null;
            let node = new THREE.Object3D();
            if(object.type === "SkinnedMesh")
            {
               //pickingMaterial.defines = {USE_SKINNING: true};
               console.log(object);
               let parent = object.parent;
               let userData = parent.userData;
               parent.userData = [];
               node = THREE.SkeletonUtils.clone(parent);
               parent.userData = userData;
               pickingCube = node.children[1];
               pickingCube.material = pickingMaterial;
               pickingCube.matrixWorldNeedsUpdate = true;
               pickingCube.updateMatrixWorld(true);
               node.type = "character";
               //pickingCube.bind(pickingCube.skeleton, pickingCube.matrixWorld);
               node.children[0].rotateX(1.5708);
               node.children[0].updateMatrixWorld(true);
              //console.log(node);
            }
            else
            {
                pickingCube = new THREE.Mesh(object.geometry, pickingMaterial);

                pickingCube.position.copy(object.worldPosition());
                pickingCube.quaternion.copy(object.worldQuaternion());
                pickingCube.scale.copy(object.worldScale());
                pickingCube.updateMatrix();
                pickingCube.updateMatrixWorld(true);
                node.type = "object"
                node.add(pickingCube);
            }
            this.pickingScene.add(node);
            pickingCube.pickerId = id;
       
        }
        this.childrenSetted = this.pickingScene.children.length === 0 ? false : true;
    }

    setPickingPosition(vector2)
    {
        this.pickingPosition.copy(vector2);
    }

    setPickingPosition(x, y)
    {
        this.pickingPosition.x = x;
        this.pickingPosition.y = y;
    }

    pick(camera)
    {
        //this.setUpSkinnedMesh();
        this.gpuPickerHelper.pick(this.pickingPosition, this.pickingScene, camera, this.renderer);
        //this.returnedBackSkinnedMesh();
    }

    setUpSkinnedMesh()
    {
        for(let i = 0, n = this.pickingScene.children.length; i < n; i++)
        {
            let child = this.pickingScene.children[i].children[0];
            if(child.type == "SkinnedMesh")
            {
                child.add(this.gpuPickerHelper.selectableObjects[child.pickerId].skeleton.bones[0]);
                child.bind(child.skeleton);
            }
        }
    }

    returnedBackSkinnedMesh()
    {
        for(let i = 0, n = this.pickingScene.children.length; i < n; i++)
        {
            let child = this.pickingScene.children[i].children[0];
            if(child.type == "SkinnedMesh")
            {
                console.log(this.gpuPickerHelper.selectableObjects[child.pickerId]);
                this.gpuPickerHelper.selectableObjects[child.pickerId].parent.add(child.skeleton.bones[0]);
                this.gpuPickerHelper.selectableObjects[child.pickerId].bind(this.gpuPickerHelper.selectableObjects[child.pickerId].skeleton);
            }
        }
    }

    updateObject()
    {
        for(let i = 0, n = this.pickingScene.children.length; i < n; i++)
        {
            let clonnedObject = this.pickingScene.children[i];
            let originalObject = clonnedObject.type === "object" ? this.gpuPickerHelper.selectableObjects[i + this.idBonus] : this.gpuPickerHelper.selectableObjects[i + this.idBonus].parent;
            clonnedObject.position.copy(originalObject.worldPosition());
            clonnedObject.quaternion.copy(originalObject.worldQuaternion());
            clonnedObject.scale.copy(originalObject.worldScale());
            clonnedObject.updateMatrix();
            clonnedObject.updateMatrixWorld(true);
            if(clonnedObject.type === "character")
            {
                let clonnedSkinnedMesh = clonnedObject.children.find(child => child.type === "SkinnedMesh");
                let originalSkinnedMesh = this.gpuPickerHelper.selectableObjects[i + this.idBonus];//.parent.children.find(child => child.type === "SkinnedMesh");
                //child.bind(child.skeleton);
                let originalRootBone = originalSkinnedMesh.skeleton.bones[0];
                let clonnedRootBone = clonnedSkinnedMesh.skeleton.bones[0];
                this.updateSkeletonBone(clonnedRootBone, originalRootBone);
                clonnedRootBone.updateMatrixWorld(true);
                console.log(clonnedSkinnedMesh);
                console.log(originalSkinnedMesh);
            }
        }
    }

    updateSkeletonBone(cloneBone, originalBone)
    {
        cloneBone.position.copy(originalBone.position);
        cloneBone.quaternion.copy(originalBone.quaternion);
        cloneBone.scale.copy(originalBone.scale);
        //cloneBone.rotateX(1.5708);
        for(let i = 0, n = originalBone.children.length; i < n; i++)
        {   
            this.updateSkeletonBone(cloneBone.children[i], originalBone.children[i]);
        }
    }

    isObjectAdded(object)
    {
        if(Object.values(this.gpuPickerHelper.selectableObjects).filter(obj => obj.uuid === object.uuid).length !== 0)
        {
            return true;
        }
        return false;
    }

    getAllSceneMeshes(sceneMesh, meshes)
    {
        let sceneChildren = sceneMesh.children;
        if(sceneChildren === undefined)
        {
            return;
        }
        if(sceneMesh.userData && (sceneMesh.userData.type === "object" || sceneMesh.userData.type === "character" ))
        {
            for(let i = 0, n = sceneChildren.length; i < n; i++)
            {
                let child = sceneChildren[i];
                if(child.type === "Mesh") 
                {
                    meshes.push(child); 
                    return;
                }
                if(child.children.length !== 0 && child.children[0].type === "LOD")
                {
                    meshes.push(child.children[0].children[0]);
                    return;
                }
                if( child.type === "SkinnedMesh")
                {
                    meshes.push(child);
                    return;
                }
            }
        }
        for(let i = 0, n = sceneChildren.length; i < n; i++)
        {
            this.getAllSceneMeshes(sceneChildren[i], meshes);
        }
    }
}
module.exports = GPUPicker;
