
const { MathUtils } = require('three')

const traverseAsset = (data) => {

    let {asset, ext, sceneObject, meshFactory} = data

    if (!asset) return []

    const children = []
    let object3d = null
    let isCopyTextures = false 

    switch (ext) {
        case '.stl': 
        case '.ply':  
            children.push(
                <primitive
                key={sceneObject ? `${sceneObject.id}-${new MathUtils.generateUUID()}` : `${new MathUtils.generateUUID()}`}
                object={meshFactory(asset,false,isCopyTextures)}
                />)
            return children

        case '.fbx':
        case '.obj':
        case '.3ds':
            object3d = asset
        break

        case '.gltf':
        case '.glb':
        case '.dae':
            object3d = asset.scene
            isCopyTextures = true
        break              

        default:
        break
    }

    if (!object3d) return []
        
    object3d.traverse(child => {
        if (child.isMesh) {
            children.push(
                <primitive
                key={`${sceneObject.id}-${child.uuid}`}
                object={meshFactory(child,false,isCopyTextures)}
                />)
        }
    })

    return children
    
}

module.exports = traverseAsset