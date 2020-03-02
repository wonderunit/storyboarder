const { useMemo, useRef, useCallback } = React = require('react')
const { useFrame } = require('react-three-fiber')

const SCALE = 0.4
const POSITION = [0, 0.02 + 0.30, 0.01 - 0.25]
const ROTATION = [-0.4, 0, 0]

const Help = React.memo(({ mode, locked, getCanvasRenderer }) => {
  const ref = useRef()

  const textureRef = useRef(null)
  const getTexture = useCallback(() => {
    if (textureRef.current === null) {
      textureRef.current = new THREE.CanvasTexture(getCanvasRenderer().helpCanvas)
      textureRef.current.flipY = false
      textureRef.current.minFilter = THREE.LinearFilter
    }
    return textureRef.current
  }, [])

  const mesh = useMemo(() => {
    return new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1, 1),
      new THREE.MeshBasicMaterial({ map: getTexture(), transparent: true, opacity: 0.8 })
    )
  }, [mode])

  // to hide help when locked, uncomment this:
  //
  // useMemo(() => {
  //   if (mesh) mesh.material.opacity = locked ? 0.15 : 0.8
  // }, [locked])

  useFrame((state, delta) => {
    if (getCanvasRenderer().helpNeedsRender) {
      getCanvasRenderer().renderHelp()
      getTexture().needsUpdate = true
    }
    getCanvasRenderer().helpNeedsRender = false
  })

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
        id: 'help'
      }}>
    </primitive>
    : null
})

module.exports = Help
