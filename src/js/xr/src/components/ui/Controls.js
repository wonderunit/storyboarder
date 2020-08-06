const { useMemo, useRef, useEffect, useCallback } = React = require('react')
const { useFrame } = require('react-three-fiber')

const { log } = require('../../components/Log')
const { useTranslation } = require('react-i18next')
const SCALE = 1
const POSITION = [0, 0.02, 0.01]
const ROTATION = [-0.8, 0, 0]

const Controls = React.memo(({ gltf, mode, hand = 'right', locked, getCanvasRenderer }) => {
  const ref = useRef()
  const { t } = useTranslation()
  const textureRef = useRef(null)
  const getTexture = useCallback(() => {
    if (textureRef.current === null) {
      textureRef.current = new THREE.CanvasTexture(getCanvasRenderer().canvas)
      textureRef.current.flipY = false
      textureRef.current.minFilter = THREE.LinearFilter
    }
    return textureRef.current
  }, [])

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
    let offset = hand == 'right' ? 0 : 0 // 6
    switch (mode) {
      case 'home':
        return meshes[6 + offset]

      case 'add':
        return meshes[5 + offset]

      case 'settings':
        return meshes[4 + offset]

      case 'properties':
        return meshes[2 + offset]

      case 'grid':
        return meshes[3 + offset]

      default:
        return meshes[0 + offset]
    }
  }, [meshes, mode, hand])

  useMemo(() => {
    if (material) material.opacity = locked ? 0.15 : 0.8
  }, [locked])

  useEffect(() => {
    getCanvasRenderer().needsRender = true
  }, [t])

  useFrame((state, delta) => {
    if (getCanvasRenderer().needsRender) {
      getCanvasRenderer().render(t)
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
      rotation={ROTATION}

      onController={() => null}
      userData={{
        type: 'ui',
        id: 'controls'
      }}>
    </primitive>
    : null
})

module.exports = Controls
