const THREE = require('three')
const { useMemo, useEffect } = React = require('react')
const { useUpdate } = require('react-three-fiber')

const getFilepathForModelByType = require('../helpers/get-filepath-for-model-by-type')

const VirtualCamera = require('../components/VirtualCamera')

const onlyOfTypes = require('../../../shot-generator/utils/only-of-types').default

const materialFactory = () => new THREE.MeshToonMaterial({
  color: 0xffffff,
  emissive: 0x0,
  flatShading: false
})

const Environment = React.memo(({ gltf, environment, grayscale }) => {
  const ref = useUpdate(
    self => {
      self.traverse(child => child.layers.enable(VirtualCamera.VIRTUAL_CAMERA_LAYER))
    }
  )

  const group = useMemo(() => {
    if (!gltf) return null

    let g = new THREE.Group()

    let sceneData = onlyOfTypes(gltf.scene, ['Scene', 'Mesh', 'Group'])

    sceneData.traverse(child => {
      if (child.isMesh) {
        let material = materialFactory()

        if (child.material.map) {
          material.map = child.material.map
          material.flatShading = child.material.flatShading
          material.map.needsUpdate = true
        }

        child.material = material
      }
    })

    g.add(...sceneData.children)

    return g
  }, [gltf])

  useEffect(() => {
    group.traverse(child => {
        if (child.isMesh) {
          child.material.defines.GRAYSCALE = grayscale
          child.material.needsUpdate = true
        }
    })
  }, [grayscale])

  const { x, y, z, visible, rotation, scale } = environment

  return <primitive
    ref={ref}

    userData={{
      type: 'environment'
    }}

    object={group}

    visible={visible}

    position={[x, z, y]}
    scale={[scale, scale, scale]}
    rotation-y={[rotation]}
  >
  </primitive>
})

module.exports = Environment
