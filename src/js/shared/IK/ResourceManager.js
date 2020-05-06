const THREE = require('three')
let instance = null;
class ResourceManager 
{
    constructor()
    {
        if(!instance)
        {
            instance = this;
            this.matrices = [];
            this.vectors = [];
            this.quaternions = [];
            this.customObjects = {};
        }
        return instance;
    }

    static getInstance()
    {
        return instance ? instance : new ResourceManager(); 
    }
    
    getQuaternion()
    {
        if(this.quaternions.length !== 0)
        {
            return this.quaternions.pop();
        }
        else
        {
            return new THREE.Quaternion();
        }
    }

    getVector3()
    {
        if(this.vectors.length !== 0)
        {
            return this.vectors.pop();
        }
        else
        {
            return new THREE.Vector3();
        }
    }

    getMatrix4()
    {
        if(this.matrices.length !== 0)
        {
            return this.matrices.pop();
        }
        else
        {
            return new THREE.Matrix4();
        }
    }

    getCustom(type) 
    {   
        let name = type.name;
        if(!this.customObjects[name] || !this.customObjects[name].length) {
            this.customObjects[name] = [];
            return new type();
        } else {
            return this.customObjects[name].pop()
        }
    }

    release(resource)
    {
        if(resource instanceof THREE.Quaternion)
        {
            resource.set(0, 0, 0, 1);
            this.quaternions.push(resource);
        }
        else if (resource instanceof THREE.Vector3)
        {
            resource.set(0, 0, 0);
            this.vectors.push(resource);
        }
        else if(resource instanceof THREE.Matrix4)
        {
            resource.identity();
            this.matrices.push(resource);
        } 
        else 
        {
            let type = resource.constructor.name;
            if(!this.customObjects[type]) this.customObjects[type] = []
            this.customObjects[type].push(resource);
        }
    }
}
module.exports = ResourceManager;
