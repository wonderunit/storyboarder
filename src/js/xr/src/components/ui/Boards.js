const { useMemo, useRef, useCallback } = React = require('react')
const { useRender } = require('react-three-fiber')

const SCALE = 6
const POSITION = [0, 4, -6]

const Boards = React.memo(({ mode, locked, getCanvasRenderer, rotation = -Math.PI * 0.75 }) => {
  const ref = useRef()

  const textureRef = useRef(null)
  const getTexture = useCallback(() => {
    if (textureRef.current === null) {
      textureRef.current = new THREE.CanvasTexture(getCanvasRenderer().boardsCanvas)
      textureRef.current.flipY = false
      textureRef.current.minFilter = THREE.LinearFilter
    }
    return textureRef.current
  }, [])

  const mesh = useMemo(() => {
    return new THREE.Mesh(
      new THREE.PlaneBufferGeometry(1, 1, 1),
      new THREE.MeshBasicMaterial({
        map: getTexture(),
        transparent: true,
        opacity: 1.0,
        side: THREE.BackSide
      })
    )
  }, [mode])

  // to hide boards when locked, uncomment this:
  //
  // useMemo(() => {
  //   if (mesh) mesh.material.opacity = locked ? 0.15 : 0.8
  // }, [locked])

  useRender((state, delta) => {
    if (getCanvasRenderer().boardsNeedsRender) {
      getCanvasRenderer().renderBoards()
      getTexture().needsUpdate = true
    }
    getCanvasRenderer().boardsNeedsRender = false
  })

  return mesh ? (
    <group position={POSITION} scale={[SCALE, SCALE, SCALE]} rotation={[rotation, 0, 0]}>
      <primitive
        ref={ref}
        object={mesh}
        onController={() => null}
        name={'gui-boards'}
        userData={{
          type: 'ui',
          id: 'boards'
        }}
      ></primitive>
    </group>
  ) : null
})

module.exports = Boards
