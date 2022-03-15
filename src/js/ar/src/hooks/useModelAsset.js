import {useMemo} from 'react'
import onlyOfTypes from "../../../shot-generator/utils/only-of-types"

const templateFn = () => {}

export const defaultMaterialFactory = () => new THREE.MeshToonMaterial({
  color: 0xffffff,
  emissive: 0x0,
  flatShading: false
})

const useModelAsset = (asset, materialFactory = defaultMaterialFactory, onTraverse = templateFn) => {
  return useMemo(() => {
    let g = new THREE.Group()

    if (!asset) {
      return g
    }

    if (asset.isBufferGeometry){ 
      g.add(new THREE.Mesh(asset,materialFactory()))
      return g
    }

    const object3d = (asset.scene !== undefined) ? asset.scene : asset

    const sceneData = onlyOfTypes(object3d, ['Scene', 'Mesh', 'Group'])

    sceneData.traverse(child => {
      let currentObject = child

      // Clone if mesh
      if (child.isMesh) {
        currentObject = currentObject.clone()
        g.add(currentObject)
      }
      
      if (currentObject.isMesh) {
        let material = materialFactory()

        if (currentObject.material.map) {
          material.map = currentObject.material.map
          material.map.needsUpdate = true
        }

        currentObject.material = material
      }

      onTraverse(currentObject)
    })

    return g
  }, [asset, onTraverse])
}

export default useModelAsset
