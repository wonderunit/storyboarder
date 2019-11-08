const { useEffect, useMemo, useRef, useCallback } = React = require('react')
const { useRender, useThree } = require('react-three-fiber')

const SCALE = 1
const POSITION = [0, 0.4, -1]

const Boards = React.memo(({ mode, locked, getCanvasRenderer, rotation = -Math.PI * 0.75 }) => {
  const { camera } = useThree()

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

  useEffect(() => {
    camera.rotation.order = 'YXZ'

    if (ref.current) {
      ref.current.parent.rotation.y = camera.rotation.y
      ref.current.parent.position.copy(camera.position)
    }
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
    <group>
      <primitive
        position={POSITION}
        scale={[SCALE, SCALE, SCALE]}
        rotation={[rotation, 0, 0]}
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
