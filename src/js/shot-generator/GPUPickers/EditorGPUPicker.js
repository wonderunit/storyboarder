const GPUPicker = require("./GPUPicker");
const SkeletonUtils = require("../IK/utils/SkeletonUtils");
class EditorGPUPicker extends GPUPicker
{
    constructor()
    {
        super();
        this.addedGroupsId = [];
        this.idBonus = 400;
    }

    initalizeChildren(scene)
    {
        super.initalizeChildren();

        let objects = [];
        let intersectObjects = scene.children;
        for(let i = 0, n = intersectObjects.length; i < n; i++)
        {
            let intesectable = intersectObjects[i];
            if(this.addedGroupsId.some(group => group === intesectable.uuid))
            {
                continue;
            }
            this.getAllSceneMeshes(intesectable, objects);
            this.addedGroupsId.push(intesectable.uuid);
        }

        for(let i = 0, n = objects.length; i < n; i++)
        {
            let object = objects[i];
            const id = this.pickingScene.children.length + i + this.idBonus;
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
                node.type = "character";
            }
            else
            {
                pickingCube = new THREE.Mesh(object.geometry, pickingMaterial);
                node.type = "object"
                node.add(pickingCube);
            }
            this.pickingScene.add(node);
            node.pickerId = id;
            //pickingCube.colorId = id;
       
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
            if(!originalObject)
            {
                continue;
            }
            clonnedObject.position.copy(originalObject.worldPosition());
            clonnedObject.quaternion.copy(originalObject.worldQuaternion());
            clonnedObject.scale.copy(originalObject.worldScale());
            clonnedObject.updateMatrixWorld(true);
            if(clonnedObject.type === "character" && this.gpuPickerHelper.selectableObjects[i + this.idBonus].skeleton)
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
  
        if(sceneMesh.userData && (sceneMesh.userData.type === "object" || sceneMesh.userData.type === "character"))
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
            console.log(sceneMesh.bonesHelper);
            if(sceneMesh.userData.type === "character" && sceneMesh.bonesHelper)
            {
                console.log("Bones helper");
                this.addConesToArray(meshes, sceneMesh.bonesHelper.cones );
                return;
            }
        }
        for(let i = 0, n = sceneChildren.length; i < n; i++)
        {
            this.getAllSceneMeshes(sceneChildren[i], meshes);
        }
    }
}
module.exports = EditorGPUPicker;
