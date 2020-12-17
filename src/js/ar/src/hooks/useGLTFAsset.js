import React, {useMemo} from 'react'
import onlyOfTypes from "../../../shot-generator/utils/only-of-types"

const templateFn = () => {}

export const defaultMaterialFactory = () => new THREE.MeshToonMaterial({
  color: 0xffffff,
  emissive: 0x0,
  flatShading: false
})

const useGLTFAsset = (asset, materialFactory = defaultMaterialFactory, onTraverse = templateFn) => {
  return useMemo(() => {
    let g = new THREE.Group()

    if (!asset) {
      return g
    }

    let sceneData = onlyOfTypes(asset, ['Scene', 'Mesh', 'Group'])

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

export default useGLTFAsset
