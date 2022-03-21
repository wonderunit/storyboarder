
const { MathUtils } = require('three')

const traverseAsset = (data) => {

    let {asset, ext, sceneObject, meshFactory} = data

    if (!asset) return []

    const children = []

    if (asset.isBufferGeometry){
        children.push(
            <primitive
                key={sceneObject ? `${sceneObject.id}-${new MathUtils.generateUUID()}` : `${new MathUtils.generateUUID()}`}
                object={meshFactory(asset,false)}
            />
        )
        return children
    }

    const object3d = asset.scene ? asset.scene : asset

    object3d.traverse(child => {
        if (child.isMesh) {
            children.push(
                <primitive
                    key={sceneObject ? `${sceneObject.id}-${child.uuid}` : `${new MathUtils.generateUUID()}`}
                    object={meshFactory(child,false)}
                />
            )
        }
    })

    return children
    
}

module.exports = traverseAsset