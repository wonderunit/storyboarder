const THREE = require('three');
const GPUPickerHelper = require("./GPUPickerHelper");
const SkeletonUtils = require("../IK/utils/SkeletonUtils");
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
        this.vrModeEnabled = false;
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
        this.vrModeEnabled = renderer.vr.enabled;
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
                let parent = null;
                if(this.vrModeEnabled)
                {
                    parent = object.parent.parent;
                }
                else
                {
                    parent = object.parent;
                }
                let userData = parent.userData;
                parent.userData = [];
                node = SkeletonUtils.clone(parent);
                parent.userData = userData;
                if(this.vrModeEnabled)
                {
                    pickingCube = node.children[0].children[0];
                }
                else
                {
                    pickingCube = node.children[1];
                }
                pickingCube.material = pickingMaterial;
                pickingCube.matrixWorldNeedsUpdate = true;
                pickingCube.updateMatrixWorld(true);
                node.type = "character";
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

    pick(camera, wall)
    {
        this.gpuPickerHelper.pick(this.pickingPosition, this.pickingScene, camera, this.renderer, wall);
    }

    updateObject()
    {
        for(let i = 0, n = this.pickingScene.children.length; i < n; i++)
        {
            let clonnedObject = null;
            let originalObject = null;
            if(this.vrModeEnabled)
            {
                clonnedObject = this.pickingScene.children[i];
                originalObject = clonnedObject.type === "object" ? this.gpuPickerHelper.selectableObjects[i + this.idBonus] : this.gpuPickerHelper.selectableObjects[i + this.idBonus].parent.parent;
            }
            else
            {
                clonnedObject = this.pickingScene.children[i];
                originalObject = clonnedObject.type === "object" ? this.gpuPickerHelper.selectableObjects[i + this.idBonus] : this.gpuPickerHelper.selectableObjects[i + this.idBonus].parent;
            }
     /*        console.log(clonnedObject);
            console.log(originalObject); */
            clonnedObject.position.copy(originalObject.worldPosition());
            clonnedObject.quaternion.copy(originalObject.worldQuaternion());
            clonnedObject.scale.copy(originalObject.worldScale());
            clonnedObject.updateMatrixWorld(true);
            if(clonnedObject.type === "character")
            {
                let clonnedSkinnedMesh = null;
                if(this.vrModeEnabled)
                {
                    clonnedSkinnedMesh = clonnedObject.children[0].children.find(child => child.type === "SkinnedMesh");
                }
                else
                {
                    clonnedSkinnedMesh = clonnedObject.children.find(child => child.type === "SkinnedMesh");
                }
                let originalSkinnedMesh = this.gpuPickerHelper.selectableObjects[i + this.idBonus];
                console.log(clonnedSkinnedMesh);
                console.log(originalSkinnedMesh);
                let originalRootBone = originalSkinnedMesh.skeleton.bones[0];
                let clonnedRootBone = clonnedSkinnedMesh.skeleton.bones[0];
           
                this.updateSkeletonBone(clonnedRootBone, originalRootBone);
                clonnedRootBone.updateMatrixWorld(true);
            }
        }
    }

    updateSkeletonBone(cloneBone, originalBone)
    {
        cloneBone.position.copy(originalBone.position);
        cloneBone.quaternion.copy(originalBone.quaternion);
        cloneBone.scale.copy(originalBone.scale);
        for(let i = 0, n = cloneBone.children.length; i < n; i++)
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
