const GPUPicker = require("./GPUPicker");
const SkeletonUtils = require("../IK/utils/SkeletonUtils");
class EditorGPUPicker extends GPUPicker
{
    constructor()
    {
        super();
    }

    initalizeChildren(scene)
    {
        super.initalizeChildren();
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
                parent = object.parent;
                let userData = parent.userData;
                parent.userData = [];
                node = SkeletonUtils.clone(parent);
                parent.userData = userData;
                pickingCube = node.children[1];
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

    updateObject()
    {
        super.updateObject();
        for(let i = 0, n = this.pickingScene.children.length; i < n; i++)
        {
            let clonnedObject = null;
            let originalObject = null;
            clonnedObject = this.pickingScene.children[i];
            originalObject = clonnedObject.type === "object" ? this.gpuPickerHelper.selectableObjects[i + this.idBonus] : this.gpuPickerHelper.selectableObjects[i + this.idBonus].parent;
            clonnedObject.position.copy(originalObject.worldPosition());
            clonnedObject.quaternion.copy(originalObject.worldQuaternion());
            clonnedObject.scale.copy(originalObject.worldScale());
            clonnedObject.updateMatrixWorld(true);
            if(clonnedObject.type === "character")
            {
                let clonnedSkinnedMesh = null;
                clonnedSkinnedMesh = clonnedObject.children.find(child => child.type === "SkinnedMesh");
                let originalSkinnedMesh = this.gpuPickerHelper.selectableObjects[i + this.idBonus];
                let originalRootBone = originalSkinnedMesh.skeleton.bones[0];
                let clonnedRootBone = clonnedSkinnedMesh.skeleton.bones[0];
           
                this.updateSkeletonBone(clonnedRootBone, originalRootBone);
                clonnedRootBone.updateMatrixWorld(true);
            }
        }
    }

    getAllSceneMeshes(sceneMesh, meshes)
    {
        super.getAllSceneMeshes();
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
module.exports = EditorGPUPicker;
