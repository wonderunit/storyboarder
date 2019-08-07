const GPUPicker = require("./GPUPicker");
const SkeletonUtils = require("../IK/utils/SkeletonUtils");
class EditorGPUPicker extends GPUPicker
{
    constructor()
    {
        super();
        this.addedGroupsId = [];
        this.idBonus = 1;
    }

    initalizeChildren(scene)
    {
        super.initalizeChildren();

        let objects = [];
        let additionalObjects = [];
        let intersectObjects = scene.children;
        for(let i = 0, n = intersectObjects.length; i < n; i++)
        {
            let intesectable = intersectObjects[i];
            if(this.addedGroupsId.some(group => group === intesectable.uuid))
            {
                continue;
            }
            this.getAllSceneMeshes(intesectable, objects, additionalObjects);
            this.addedGroupsId.push(intesectable.uuid);
        }

        for(let i = 0, n = objects.length; i < n; i++)
        {
            let object = objects[i];
            const id = this.pickingScene.children.length + i + this.idBonus;
            object.parent.updateMatrixWorld(true);
           
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
                let {cones, selectable} = this.initializeCones(additionalObjects[parent.uuid]);
                node.cones = cones;
                node.selectable = selectable;
            }
            else if (object.userData.type === "bone")
            {
                pickingCube = new THREE.Mesh(object.geometry, pickingMaterial);
                node.type = object.userData.type;
                node.userData.name = object.userData.name;
                node.add(pickingCube);
            }
            else
            {
                pickingCube = new THREE.Mesh(object.geometry, pickingMaterial);
                node.type = object.userData.type;
                node.add(pickingCube);
            }
            this.pickingScene.add(node);
            node.pickerId = id;
            this.gpuPickerHelper.selectableObjects[id] = { originObject: object, pickerObject: node} ;
            //pickingCube.colorId = id;           
        }
        this.childrenSetted = this.pickingScene.children.length === 0 ? false : true;
    }

    updateObject()
    {
        super.updateObject();
        for(let i = 0, n = this.pickingScene.children.length; i < n; i++)
        {
            let clonnedObject = this.pickingScene.children[i];
            let originalObject = clonnedObject.type === "character" ? this.gpuPickerHelper.selectableObjects[clonnedObject.pickerId].originObject.parent : this.gpuPickerHelper.selectableObjects[clonnedObject.pickerId].originObject;
            if(!originalObject)
            {
                continue;
            }
            clonnedObject.position.copy(originalObject.worldPosition());
            clonnedObject.quaternion.copy(originalObject.worldQuaternion());
            clonnedObject.scale.copy(originalObject.worldScale());
            clonnedObject.updateMatrixWorld(true);
            if(clonnedObject.type === "character" && this.gpuPickerHelper.selectableObjects[clonnedObject.pickerId].originObject.skeleton)
            {
                let clonnedSkinnedMesh = null;
                clonnedSkinnedMesh = clonnedObject.children.find(child => child.type === "SkinnedMesh");
                let originalSkinnedMesh = this.gpuPickerHelper.selectableObjects[clonnedObject.pickerId].originObject;
            
                let originalRootBone = originalSkinnedMesh.skeleton.bones[0];
                let clonnedRootBone = clonnedSkinnedMesh.skeleton.bones[0];
           
                this.updateSkeletonBone(clonnedRootBone, originalRootBone);
                clonnedRootBone.updateMatrixWorld(true);
                this.updateCones(clonnedObject.cones);
            }
        }
    }

    getAllSceneMeshes(sceneMesh, meshes, additionalObjects)
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
                }
            }
            if(sceneMesh.userData.type === "character" && sceneMesh.bonesHelper)
            {
                additionalObjects[sceneMesh.uuid] = sceneMesh.bonesHelper.cones;//this.addConesToArray(meshes, sceneMesh.bonesHelper.cones );
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
