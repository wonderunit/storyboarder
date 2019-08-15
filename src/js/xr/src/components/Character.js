const THREE = require('three')
const { useMemo } = React = require('react')

const useModel = require('../hooks/use-model')

const Character = ({ sceneObject }) => {
  // TODO detect user models, e.g.: `/data/user/characters/${filename}`
  const [geometries] = useModel(`/data/system/dummies/gltf/${sceneObject.model}-lod.glb`)

  const material = useMemo(() => new THREE.MeshBasicMaterial())

  const lod = useMemo(
    () => {
      let lod = new THREE.LOD()
      for (let i = 1, d = 0; i < geometries.length; i++, d++) {
        let geometry = geometries[i]
        let mesh = new THREE.Mesh(geometry, material)
        // console.log('adding mesh index', i, 'at distance', d * 2, 'm', '#', geometry.index.count)
        lod.addLevel(mesh, d * 2)
      }
      return lod
    },
    [geometries]
  )

  return lod
    ? <primitive object={lod} />
    : null
}

module.exports = Character
