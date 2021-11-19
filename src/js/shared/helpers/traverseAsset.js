
// import * as THREE from 'three'
const THREE = require('three')

const checkStandardMaterial = (child) => {
    // let prevMaterial = null
    if (!child.material.isMeshStandardMaterial){
      // prevMaterial = child.material.clone()
      child.material = new THREE.MeshStandardMaterial()
      // child.material.copy(prevMaterial)
    }
    return null
  }

const traverseAsset = ({asset, ext, sceneObject, meshFactory}) => {

    if (!asset) return []

    const children = []
    let object3d = null

    switch (ext) {
        case '.stl':  
            object3d = new THREE.Object3D().add(new THREE.Mesh(asset,new THREE.MeshStandardMaterial()))
        break

        case '.fbx':
        case '.obj':
            object3d = asset
        break

        case '.gltf':
        case '.glb':
        case '.glb':
        case '.dae':
            object3d = asset.scene
        break              

        default:
        break
    }

    if (!object3d) return []
        
    object3d.traverse(child => {
        if (child.isMesh) {
            checkStandardMaterial(child)
            children.push(
                <primitive
                key={`${sceneObject.id}-${child.uuid}`}
                object={meshFactory(child)}
                />)
        }
    })

    return children
    
}

// export default traverseAsset
module.exports = traverseAsset