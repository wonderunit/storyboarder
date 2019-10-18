let instance = null;
class ResourceManager 
{
    constructor()
    {
        if(!instance)
        {
            this.matrices = [];
            this.vectors = [];
            this.quaternions = [];
        }
        return instance;
    }

    static getInstance()
    {
        return instance ? instace : new ResourceManager(); 
    }
    
    getQuaternion()
    {
        if(this.quaternions.length !== 0)
        {
            return this.quaternions.shift();
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
            return this.vectors.shift();
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
            return this.matrices.shift();
        }
        else
        {
            return new THREE.Matrix4();
        }
    }

    release(resource)
    {
        if(resource instanceof THREE.Quaternion)
        {
            resource.set(0, 0, 0, 0);
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
    }
}
module.exports = ResourceManager;
