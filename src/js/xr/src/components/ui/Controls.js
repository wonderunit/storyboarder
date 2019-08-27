const { useMemo, useRef, useEffect } = React = require('react')
const { useRender } = require('react-three-fiber')

const useGltf = require('../../hooks/use-gltf')

const { log } = require('../../components/Log')

const SCALE = 0.025
const POSITION = [0.07, 0.01, -0.1]

const Controls = React.memo(({ mode, getCanvasRenderer }) => {
  const ref = useRef()

  const textureRef = useRef(null)
  const getTexture = () => {
    if (textureRef.current === null) {
      textureRef.current = new THREE.CanvasTexture(getCanvasRenderer().canvas)
      textureRef.current.flipY = false
      textureRef.current.minFilter = THREE.LinearFilter
    }
    return textureRef.current
  }

  const gltf = useGltf('/data/system/xr/ui/controls.glb')

  const mesh = useMemo(
    () => {
      let mesh = gltf.scene.children[0].clone()

      let material = new THREE.MeshBasicMaterial({
        map: getTexture()
      })

      mesh.material = material

      return mesh
    },
    [gltf]
  )

  useRender((state, delta) => {
    getCanvasRenderer().render()
    getTexture().needsUpdate = true
  })

  log('Controls mode:', mode)

  return mesh
    ? <primitive
      ref={ref}
      object={mesh}

      position={POSITION}
      scale={[SCALE, SCALE, SCALE]}

      onController={() => null}
      userData={{
        type: 'ui',
        id: 'controls'
      }}>
    </primitive>
    : null
})

module.exports = Controls
