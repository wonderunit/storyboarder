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

const meshFactory = (source) => {

  const material = materialFactory()

  if (source.material.map) {
    material.map = source.material.map
    material.flatShading = source.material.flatShading
    material.map.needsUpdate = true
  }

  source.material = material
}

const traverseFcn = (object3d) => {

  if (!object3d) return null

  const group = new THREE.Group()

  if (object3d.isBufferGeometry){ 
    group.add(new THREE.Mesh(object3d, materialFactory()))
    return group
  }

  const sceneData = onlyOfTypes(object3d.scene ? object3d.scene : object3d, ['Scene', 'Mesh', 'Group'])

  sceneData.traverse(child => {
    if (child.isMesh) meshFactory(child)
  })

  group.add(...sceneData.children)
  return group
}

const Environment = React.memo(({ model, environment, grayscale }) => {
  const ref = useUpdate(
    self => {
      self.traverse(child => child.layers.enable(VirtualCamera.VIRTUAL_CAMERA_LAYER))
    }
  )

  const group = useMemo(() => traverseFcn(model), [model])

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
