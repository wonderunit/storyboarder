const { useEffect, useMemo, useRef, useCallback } = React = require('react')
const { useFrame, useThree } = require('react-three-fiber')
const { useTranslation } = require('react-i18next')
const SCALE = 1
const POSITION = [0, 0, 0]

const Boards = React.memo(({ mode, locked, getCanvasRenderer, showConfirm, showSettings, rotation = -Math.PI * 1 }) => {
  const { camera, gl } = useThree()
  const { t } = useTranslation()
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
    if (ref.current && gl.xr.getSession()) {
      const copyCamera = new THREE.PerspectiveCamera()
      gl.xr.getSession() && gl.xr.getCamera(copyCamera)
      
      const absoluteMatrix = new THREE.Matrix4().multiplyMatrices(camera.parent.matrixWorld, copyCamera.matrixWorld)
      
      const position = new THREE.Vector3()
      const rotation = new THREE.Quaternion()
      const scale = new THREE.Vector3()

      copyCamera.matrixWorld.decompose(position, rotation, scale)
      
      const direction = new THREE.Vector3(0.0, 0.0, -1.0).applyQuaternion(rotation).setComponent(1, 0.0).normalize()
      position.setFromMatrixPosition(absoluteMatrix)
      
      ref.current.parent.position.set(direction.x, camera.position.y * 0.5, direction.z)
      ref.current.parent.lookAt(position.x, position.y, position.z)
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

  useEffect(() => {
    getCanvasRenderer().boardsNeedsRender = true
  }, [t])
  // to hide boards when locked, uncomment this:
  //
  // useMemo(() => {
  //   if (mesh) mesh.material.opacity = locked ? 0.15 : 0.8
  // }, [locked])

  useFrame((state, delta) => {
    if (getCanvasRenderer().boardsNeedsRender) {
      getCanvasRenderer().renderBoards(t)
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
          }}/>
        {showConfirm && <primitive
          object={confirmMesh}
          onController={() => null}
          name={'gui-boards'}
          userData={{
            type: 'ui',
            id: 'boards'
          }}/>}
        {showSettings && <primitive
          object={settingsMesh}
          onController={() => null}
          name={'gui-boards'}
          userData={{
            type: 'ui',
            id: 'boards'
          }}/>}
      </group>
    </group>
  ) : null
})

module.exports = Boards
