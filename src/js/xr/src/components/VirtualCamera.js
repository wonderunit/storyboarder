const THREE = require('three')
const { useMemo, useRef, useCallback, useEffect } = React = require('react')
const { useFrame, useThree, useUpdate } = require('react-three-fiber')
require('../three/GPUPickers/utils/Object3dExtension')

const traverseMeshMaterials = require('../helpers/traverse-mesh-materials')

const CLOSE_DISTANCE = 7
const VIRTUAL_CAMERA_LAYER = 1

const materialFactory = () => new THREE.MeshBasicMaterial({
  color: 0x8c78f1,
  flatShading: false
})

const meshFactory = source => {
  const mesh = source.clone()

  const material = materialFactory()

  if (mesh.material.map) {
    material.map = mesh.material.map
    material.map.needsUpdate = true
  }
  mesh.material = material

  return mesh
}

const VirtualCamera = React.memo(({ gltf, aspectRatio, sceneObject, isSelected, isActive, getCanvasRenderer, thumbnailRenderer, boardUid, audio }) => {
  const { gl, scene, camera } = useThree()

  const ref = useUpdate(
    self => {
      self.rotation.x = 0
      self.rotation.z = 0
      self.rotation.y = sceneObject.rotation || 0

      self.rotateX(sceneObject.tilt || 0)
      self.rotateZ(sceneObject.roll || 0)
    },
    [sceneObject.rotation, sceneObject.tilt, sceneObject.roll]
  )
  
  const virtualCamera = useUpdate(self => {
    self.updateProjectionMatrix()
    self.layers.set(VIRTUAL_CAMERA_LAYER)
  })

  const renderTarget = useRef()
  const size = 1 / 3
  const resolution = 512
  const previousTime = useRef(null)

  const cameraThumbnail = useRef(new Image())
  const cr = useRef(getCanvasRenderer())

  const getRenderTarget = useCallback(() => {
    if (!renderTarget.current) {
      renderTarget.current = new THREE.WebGLRenderTarget(resolution * aspectRatio, resolution)
    }
    return renderTarget.current
  }, [resolution, aspectRatio])

  useEffect(() => {
    return destroyTarget = () => {
      renderTarget.current.dispose()
    }
  }, [])

  useEffect(() => {
    if (boardUid && thumbnailRenderer.current) saveCameraThumbnail()
  }, [boardUid])

  const saveCameraThumbnail = () => {
    // Render on separate canvas
    thumbnailRenderer.current.render(scene, virtualCamera.current)

    // Trigger HUD rerender
    cameraThumbnail.current.src = thumbnailRenderer.current.domElement.toDataURL('image/png')
    const thumbnailName = `${boardUid}_${sceneObject.displayName}`
    cr.current.state.cameraThumbnails[thumbnailName] = cameraThumbnail.current

    setTimeout(() => {
      cr.current.boardsNeedsRender = true
    }, 250)
  }

  const renderCamera = () => {
    if (virtualCamera.current && getRenderTarget()) {
      gl.xr.enabled = false
      scene.autoUpdate = false
      gl.setRenderTarget(getRenderTarget())

      gl.render(scene, virtualCamera.current)

      gl.setRenderTarget(null)
      scene.autoUpdate = true
      gl.xr.enabled = true
    }
  }

  useMemo(() => {
    if (isSelected) {
      renderCamera()
    }
  }, [isSelected])

  const meshes = useMemo(() => {
    if (!gltf) return []

    let children = []

    gltf.scene.traverse(child => {
      if (child.isMesh) {
        children.push(
          meshFactory(child)
        )
      }
    })

    return children
  }, [gltf])

  const meshChildren = useMemo(
    () =>
      meshes.map(
        mesh => <primitive key={mesh.uuid} object={mesh} />
      ),
    [meshes]
  )

  useMemo(() => {
    if (!ref.current) return

    //let amp = isSelected ? 0.2 : 0

    let lightColor = 0x8c78f1

    if (isSelected) {
      lightColor = 0x7256ff
    }


    meshes.forEach(mesh =>
      traverseMeshMaterials(mesh, material => {
        material.color = new THREE.Color(lightColor)
      })
    )
  }, [ref.current, meshes, isSelected])

  const heightShader = useMemo(
    () => new THREE.MeshBasicMaterial({
      map: getRenderTarget().texture,
      side: THREE.FrontSide
    }),
    [getRenderTarget]
  )

  const instancedBorderGroup = useMemo(() => {

    const geometry = new THREE.PlaneBufferGeometry(1, 1)
    const material = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, color: 0xcccccc, opacity: 0.8, transparent: true })
    const instancedBorderMesh = new THREE.CustomInstancedMesh(geometry, material, 4, false, false, false)
    const instancedBorderGroup = new THREE.Group()

    for (let i = 0; i < 4; i++) {
      instancedBorderGroup.add(instancedBorderMesh)
      if (i < 2) {
        instancedBorderMesh.setPositionAt(i, new THREE.Vector3((size * aspectRatio + 0.009) * (i % 2 === 0 ? 0.5 : -0.5), 0.3, 0))
        instancedBorderMesh.setScaleAt(i, new THREE.Vector3(0.009, size, 0))
      } else {
        instancedBorderMesh.setPositionAt(i, new THREE.Vector3(0, 0.3 + (size + 0.009) * (i % 2 === 0 ? 0.5 : -0.5), 0))
        instancedBorderMesh.setScaleAt(i, new THREE.Vector3(size * aspectRatio + 0.009 * 2, 0.009, 0))
      }
    }

    return instancedBorderGroup
  }, [])

  const cameraView = useMemo(() => {
    return <group>
      <mesh
        position={[0, 0.3, 0]}
        material={heightShader}
      >
        <planeGeometry attach='geometry' args={[size * aspectRatio, size]} />
      </mesh>
      <mesh
        position={[0, 0.3, 0]}
        rotation={[0, Math.PI, 0]}
        scale={[-1,1,1]}
        material={heightShader}
      >
        <planeGeometry attach="geometry" args={[size * aspectRatio, size]} />
      </mesh>
      <primitive object={instancedBorderGroup} userData={{ preventInteraction: true }} />
    </group>
  }, [])

  useFrame(() => {
    if (!ref.current) return

    let isClose = false

    // check if virtual camera in view and close

    const frustum = new THREE.Frustum()
    const cameraViewProjectionMatrix = new THREE.Matrix4()

    camera.updateMatrixWorld() // make sure the camera matrix is updated
    cameraViewProjectionMatrix.multiplyMatrices(
      camera.projectionMatrix,
      camera.matrixWorldInverse
    )
    frustum.setFromProjectionMatrix(cameraViewProjectionMatrix)
    // frustum is now ready to check all the objects you need

    const mesh = ref.current.children.find(c => c.isMesh)
    const isInView = frustum.intersectsObject(mesh)

    if (isInView) {
      const distance = ref.current.worldPosition().distanceTo(camera.worldPosition())
      isClose = distance < CLOSE_DISTANCE ? true : false
    } else {
      isClose = false
    }

    if (!previousTime.current) previousTime.current = 0

    const currentTime = Date.now()
    const delta = currentTime - previousTime.current

    if (delta > 500) {
      // time has elapsed
      previousTime.current = currentTime
      if (boardUid) saveCameraThumbnail()

      // but if the camera is not in view, don't bother rendering
      if (!isInView) return
    } else {
      // time hasn't elapsed yet
      // so if this virtual camera is not selected or close, don't render
      // if it's not in view, it's considered not close, and also will not render
      if ( !(isSelected || isClose) ) return
    }

    renderCamera()
  }, false, [isSelected, ref.current, meshes, boardUid])

  let lightColor = 0x8c78f1
  if (isSelected) {
    lightColor = 0x7256ff
  }

  let activeIndicator = isActive
    ? <mesh position={[0, size + 0.075 + 0.15, 0]}>
      <cylinderBufferGeometry attach="geometry" args={[0.075, 0, 0.075]} />
      <meshBasicMaterial attach="material" color={lightColor} />
    </mesh>
    : null

  return <group
    ref={ref}
    onController={() => null}
    userData={{
      type: 'virtual-camera',
      id: sceneObject.id
    }}
    position={[sceneObject.x, sceneObject.z, sceneObject.y]}
  >
    {activeIndicator}
    {cameraView}
    {meshChildren}
    <group position={[0, 0, 0]}>
      <perspectiveCamera
        ref={virtualCamera}
        aspect={aspectRatio}
        fov={sceneObject.fov}
        near={0.01}
        far={1000}
      />
    </group>

    {
      audio &&
        <primitive
          position={[0, 0, -2]}
          object={audio} />
    }
  </group>
})

VirtualCamera.VIRTUAL_CAMERA_LAYER = VIRTUAL_CAMERA_LAYER

module.exports = VirtualCamera
