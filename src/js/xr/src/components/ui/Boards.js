const { useEffect, useMemo, useRef, useCallback } = React = require('react')
const { useRender, useThree } = require('react-three-fiber')

const SCALE = 1
const POSITION = [0, 0.4, -1]

const Boards = React.memo(({ mode, locked, getCanvasRenderer, showConfirm, showSettings, rotation = -Math.PI * 1 }) => {
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

  const [mesh, confirmMesh, settingsMesh] = useMemo(() => {
    let hudGeo = new THREE.PlaneBufferGeometry(1, 469 / 1024, 1)
    hudGeo.attributes.uv.array[1] = hudGeo.attributes.uv.array[3] = 469 / 1024

    let settingsGeo = new THREE.PlaneBufferGeometry(439 / 1024, (325 - 114) / 1024, 1)
    settingsGeo.attributes.uv.array[1] = settingsGeo.attributes.uv.array[3] = (483 - 3 + 325 - 114) / 1024
    settingsGeo.attributes.uv.array[5] = settingsGeo.attributes.uv.array[7] = (483 - 3) / 1024
    settingsGeo.attributes.uv.array[0] = settingsGeo.attributes.uv.array[4] = (1024 - 439) / 1024

    let popupGeo = new THREE.PlaneBufferGeometry((118 + 168 + 18 * 4 + 15) / 1024, (18 * 3 * 2 + 30) / 1024, 1)
    popupGeo.attributes.uv.array[1] = popupGeo.attributes.uv.array[3] = (430 + 18 * 3 + (18 * 3 * 2 + 30)) / 1024
    popupGeo.attributes.uv.array[5] = popupGeo.attributes.uv.array[7] = (430 + 18 * 3) / 1024
    popupGeo.attributes.uv.array[2] = popupGeo.attributes.uv.array[6] = (118 + 168 + 18 * 4 + 15) / 1024

    hudGeo = new THREE.Geometry().fromBufferGeometry(hudGeo)
    settingsGeo = new THREE.Geometry().fromBufferGeometry(settingsGeo).translate((1024 - 439) / 1024 * 0.5, 0.345, 0)
    popupGeo = new THREE.Geometry().fromBufferGeometry(popupGeo).translate((1024 - (118 + 168 + 18 * 4 + 15)) / 1024 * -0.5, 0.31, 0)

    const material = new THREE.MeshBasicMaterial({
      map: getTexture(),
      transparent: true,
      opacity: 1.0,
      side: THREE.BackSide
    })

    const mesh = new THREE.Mesh(hudGeo, material)
    const settingsMesh = new THREE.Mesh(settingsGeo, material)
    const confirmMesh = new THREE.Mesh(popupGeo, material)

    return [mesh, confirmMesh, settingsMesh]
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
      <group
        position={POSITION}
        scale={[SCALE, SCALE, SCALE]}
        rotation={[rotation, 0, 0]}
        ref={ref}
      >
        <primitive
          object={mesh}
          onController={() => null}
          name={'gui-boards'}
          userData={{
            type: 'ui',
            id: 'boards'
          }}></primitive>
        {showConfirm && <primitive
          object={confirmMesh}
          onController={() => null}
          name={'gui-boards'}
          userData={{
            type: 'ui',
            id: 'boards'
          }}></primitive>}
        {showSettings && <primitive
          object={settingsMesh}
          onController={() => null}
          name={'gui-boards'}
          userData={{
            type: 'ui',
            id: 'boards'
          }}></primitive>}
      </group>
    </group>
  ) : null
})

module.exports = Boards
