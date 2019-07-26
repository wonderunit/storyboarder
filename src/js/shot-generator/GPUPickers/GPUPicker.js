const THREE = require('three');
const GPUPickerHelper = require("./GPUPickerHelper");
require("../IK/utils/Object3dExtension");

class GPUPicker
{
    constructor()
    {
        this.scene = new THREE.Scene();
        this.pickingPosition = new THREE.Vector2();
        this.gpuPickerHelper = new GPUPickerHelper();
        this.scene.background = new THREE.Color(0);
        this.isInitialized = false;
        this.childrenSetted = false;
    }

    initialize(scene, renderer)
    {
        if(this.isInitialized )
        {
            return;
        }
        //console.log(renderer);
        this.scene = scene.clone(false);
        this.children = scene.children;
        this.renderer = renderer;
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
            this.childrenSetted = true;
            let objects = children.filter(child => child.type !== "camera" && child.type !== "DirectionalLight" && child.type !== "AmbientLight" && child.children.filter(obj => obj.type === "Mesh").length !== 0);
            objects = objects.flatMap(child => child.children.filter(obj => obj.type === "Mesh" && obj.material.type === "MeshToonMaterial"));
            for(let i = 0, n = objects.length; i < n; i++)
            {
                const id = i + 1;
                let object = objects[i];
                this.gpuPickerHelper.selectableObjects[id] = object;
                const pickingMaterial = new THREE.MeshPhongMaterial({
                    emissive: new THREE.Color(id),
                    color: new THREE.Color(id),
                    specular: new THREE.Color(0, 0, 0),
                    transparent: true,
                    side: THREE.DoubleSide,
                    alphaTest: 0.5,
                    blending: THREE.NoBlending,
                  });
                  const pickingCube = new THREE.Mesh(object.geometry, pickingMaterial);
                  pickingCube.position.copy(object.worldPosition());
                  pickingCube.rotation.copy(object.rotation);
                  pickingCube.scale.copy(object.worldScale());
                  this.scene.add(pickingCube);
                  //children[0].parent.add(pickingCube);
                  console.log(pickingMaterial);
                  console.log(id);
                  console.log(new THREE.Color(id));
            }
        }
    }

    setPickingPosition(vector2)
    {
        this.pickingPosition.copy(vector2);
    }

    setPickingPosition(x, y)
    {
        console.log("x", x, y)
        this.pickingPosition.x = x;
        this.pickingPosition.y = y;
    }

    pick(camera)
    {
        //this.updateObject();
        console.log("Pick", this.scene);
        this.gpuPickerHelper.pick(this.pickingPosition, this.scene, camera, this.renderer);
    }

    updateObject()
    {
        for(let i = 0, n = this.scene.children; i < n; i++)
        {
            let child = this.scene.children[i];
            let object = this.gpuPickerHelper.selectableObjects[i + 1];
            child.position.copy(object.worldPosition());
            child.rotation.copy(object.rotation);
            child.scale.copy(object.worldScale());
        }
    }
}
module.exports = GPUPicker;
