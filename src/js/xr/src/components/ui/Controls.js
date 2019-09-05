const { useMemo, useRef, useCallback } = React = require('react')
const { useRender } = require('react-three-fiber')

const useGltf = require('../../hooks/use-gltf')

const { log } = require('../../components/Log')

const SCALE = 0.025
const POSITION = [0.07, 0.05, 0.02]
const ROTATION = [0.8, 0, 0]

const Controls = React.memo(({ mode, getCanvasRenderer }) => {
  const ref = useRef()

  const textureRef = useRef(null)
  const getTexture = useCallback(() => {
    if (textureRef.current === null) {
      textureRef.current = new THREE.CanvasTexture(getCanvasRenderer().canvas)
      textureRef.current.flipY = false
      textureRef.current.minFilter = THREE.LinearFilter
    }
    return textureRef.current
  }, [])

  const gltf = useGltf('/data/system/xr/ui/controls.glb')

  const material = useMemo(
    () => new THREE.MeshBasicMaterial({
      map: getTexture(),
      transparent: true,
      opacity: 0.8
    }),
    []
  )

  const meshes = useMemo(
    () => gltf.scene.children.map(originalMesh => {
      let mesh = originalMesh.clone()
      mesh.material = material
      return mesh
    }),
    [gltf]
  )

  const mesh = useMemo(() => {
    switch (mode) {
      case 'home':
        return meshes[6]

      case 'add':
        return meshes[5]

      case 'settings':
        return meshes[4]

      case 'properties':
        return meshes[2]


      default:
        return meshes[0]
    }
  }, [meshes, mode])

  useRender((state, delta) => {
    if (getCanvasRenderer().needsRender) {
      getCanvasRenderer().render()
      getTexture().needsUpdate = true
    }
    getCanvasRenderer().needsRender = false
  })

  log(`Controls mode: ${mode}`)

  return mesh
    ? <primitive
      ref={ref}
      object={mesh}

      position={POSITION}
      scale={[SCALE, SCALE, SCALE]}
      rotation = {ROTATION}

      onController={() => null}
      userData={{
        type: 'ui',
        id: 'controls'
      }}>
    </primitive>
    : null
})

module.exports = Controls
