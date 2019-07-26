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
        this.idBonus = 1;
    }

    initialize(scene, renderer, rendererEffect)
    {
        if(this.isInitialized )
        {
            return;
        }
        console.log(scene);
        this.pickingScene.background = new THREE.Color(0);
        this.children = scene.children;
        this.renderer = renderer;
        this.rendererEffect = rendererEffect;
        this.isInitialized = true;
    }

    addObject(object)
    {
        //this.scene.children.add(object);
    }

    // TODO: don't make it each step
    setChildren(children)
    {
        if(!this.childrenSetted)
        {
            
            let objects = children.filter(child => child.type !== "camera" && child.type !== "DirectionalLight" && child.type !== "AmbientLight" && child.children.filter(obj => obj.type === "Mesh").length !== 0);
            objects = objects.flatMap(child => child.children.filter(obj => obj.type === "Mesh" && obj.material.type === "MeshToonMaterial"));
            for(let i = 0, n = objects.length; i < n; i++)
            {
                const id = i + this.idBonus;
                let object = objects[i];
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
                  const pickingCube = new THREE.Mesh(object.geometry, pickingMaterial);
                  this.pickingScene.add(pickingCube);
                  pickingCube.position.copy(object.worldPosition());
                  pickingCube.quaternion.copy(object.worldQuaternion());
                  pickingCube.scale.copy(object.worldScale());
                 // pickingCube.matrix.copy( object.matrixWorld );
                  pickingCube.updateMatrixWorld(true);
                  pickingCube.updateMatrix(true);
                
                }
                console.log(children[0].parent);
                console.log(this.pickingScene);

            this.childrenSetted = this.pickingScene.children.length === 0 ? false : true;
        }
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
        //this.updateObject();
        console.log("Pick", camera);
        //console.log(this.pickingScene);
        this.gpuPickerHelper.pick(this.pickingPosition, this.pickingScene, camera, this.renderer, this.rendererEffect);
    }

    updateObject()
    {
        console.log(this.pickingScene);
        for(let i = 0, n = this.pickingScene.children.length; i < n; i++)
        {
            let child = this.pickingScene.children[i];
            //console.log(this.gpuPickerHelper.selectableObjects);
            let object = this.gpuPickerHelper.selectableObjects[i + this.idBonus];
            child.position.copy(object.worldPosition());
            child.quaternion.copy(object.worldQuaternion());
            child.scale.copy(object.worldScale());
            child.updateMatrix();
            child.updateMatrixWorld(true);
        }
    }
}
module.exports = GPUPicker;
