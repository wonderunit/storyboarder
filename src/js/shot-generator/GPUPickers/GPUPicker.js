const THREE = require('three');
const GPUPickerHelper = require("./GPUPickerHelper");
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

    addObject(object)
    {
        //this.scene.children.add(object);
    }

    // TODO: don't make it each step
    initalizeChildren(scene)
    {
        /*         let objects = children.filter(child => (child.type === "box" || child.type === "character") && child.children.filter(obj => obj.type === "Mesh" ||  obj.type === "SkinnedMesh").length !== 0);
        objects = objects.flatMap(child => child.children.filter(obj => (obj.type === "Mesh" || obj.type === "SkinnedMesh") && obj.material.type === "MeshToonMaterial"));
        */
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
                specular: new THREE.Color(0, 0, 0),
                transparent: true,
                side: THREE.DoubleSide,
                alphaTest: 0.5,
                blending: THREE.NoBlending,
                
              });
            let pickingCube = null;
            if(object.type === "SkinnedMesh")
            {
              //pickingCube = object.clone();//new THREE.SkinnedMesh(object.geometry.clone(), pickingMaterial);
              //pickingCube.material = pickingMaterial;
              //let skeleton = new THREE.Skeleton( object.skeleton.bones );
              //pickingCube.bindMode = "detached";
              //object.bindMode = "detached";
              //object.bind(object.skeleton);
              //let rootBone = pickingCube.skeleton.bones[ 0 ];
              //pickingCube.add( rootBone );
              //pickingCube.bind( pickingCube.skeleton);
              
              //console.log(object);
              //console.log(pickingCube);
            }
            else
            {
            }
            pickingCube = new THREE.Mesh(object.geometry, pickingMaterial);
            this.pickingScene.add(pickingCube);
            //scene.add(pickingCube);
            //this.pickingScene = scene;
            pickingCube.position.copy(object.worldPosition());
            pickingCube.quaternion.copy(object.worldQuaternion());
            pickingCube.scale.copy(object.worldScale());
            pickingCube.updateMatrix();
            object.updateMatrix();
            object.updateMatrixWorld();
            //console.log(object);
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
            let child = this.pickingScene.children[i];
            let object = this.gpuPickerHelper.selectableObjects[i + this.idBonus];
            child.position.copy(object.worldPosition());
            child.quaternion.copy(object.worldQuaternion());
            child.scale.copy(object.worldScale());
            child.updateMatrix();
            child.updateMatrixWorld(true);
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

    getAllSceneMeshes(scene, meshes)
    {
        let sceneChildren = scene.children;
        if(sceneChildren === undefined)
        {
            return;
        }
        if(scene.userData && (scene.userData.type === "object" || scene.userData.type === "character" ) && scene.userData.id !== "controller")
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
                if(child.children.length !== 0 && child.children[0].type === "SkinnedMesh")
                {
                    meshes.push(child.children[0]);
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
