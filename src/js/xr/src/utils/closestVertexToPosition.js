
// Gets the closes vertex of object to position
// Position shoud be in global space
// Object should be Mesh or SkinnedMesh
const findClosestVertexToPosition = (object, position) => {
    let vertices = null
    if(object.isMesh)
    {
        vertices = object.geometry.attributes.position.array
    }
    else
    {
        return
    }
    let distance,
    currentDistance = null,
    vertex = new THREE.Vector3(),
    startingNumber = null,
    localPosition = object.worldToLocal(position.clone())
    let vector = new THREE.Vector3()
    for(let i = 0; i < vertices.length; i+=3) {
        vector.set(vertices[i], vertices[i+1], vertices[i+2])
        distance = vector.distanceTo(localPosition)
        if(!currentDistance || currentDistance > distance)
        {
            currentDistance = distance
            vertex.copy(vector)
            startingNumber = i
            continue
        }
    }
    return {vertex: vertex, startingNumber: startingNumber}
}

module.exports = findClosestVertexToPosition
