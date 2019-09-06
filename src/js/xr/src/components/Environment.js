const THREE = require('three')
const { useMemo } = React = require('react')
const { useUpdate } = require('react-three-fiber')

const useGltf = require('../hooks/use-gltf')
const getFilepathForModelByType = require('../helpers/get-filepath-for-model-by-type')

const VirtualCamera = require('../components/VirtualCamera')

const onlyOfTypes = require('../../../shot-generator/only-of-types')

const materialFactory = () => new THREE.MeshLambertMaterial({
  color: 0xffffff,
  emissive: 0x0,
  specular: 0x0,
  shininess: 0,
  flatShading: false
})

const Environment = React.memo(({ environment }) => {
  const ref = useUpdate(
    self => {
      self.traverse(child => child.layers.enable(VirtualCamera.VIRTUAL_CAMERA_LAYER))
    }
  )

  const filepath = useMemo(
    () => getFilepathForModelByType({ type: 'environment', model: environment.file }),
    [environment.file]
  )

  const gltf = useGltf(filepath)

  const group = useMemo(() => {
    if (!gltf) return null

    let g = new THREE.Group()

    let sceneData = onlyOfTypes(gltf.scene, ['Scene', 'Mesh', 'Group'])

    sceneData.traverse(child => {
      if (child.isMesh) {
        child.material = materialFactory()
      }
    })

    g.add(...sceneData.children)

    return g
  }, [gltf])

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
