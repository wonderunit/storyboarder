const { useUpdate, useThree, useRender } = require('../lib/react-three-fiber')
const React = require('react')
const { useEffect, useRef, useState } = React

const SGVirtualCamera = ({ i, aspectRatio, selectedObject, ...props }) => {
  const [camSliderFOV, setCamSliderFOV] = useState(null)

  const previousTime = useRef([null])
  const isSelected = useRef(false)

  const virtualCamera = useRef(null)
  const renderTarget = useRef(null)
  const targetMesh = useRef(null)
  const hideArray = useRef([])

  const size = props.size || 1 / 3
  const padding = 0.05
  const resolution = 512

  const findParent = obj => {
    while (obj) {
      if (!obj.parent || obj.parent.type === 'Scene') {
        return obj
      }
      obj = obj.parent
    }

    return null
  }

  const { gl, scene } = useThree()
  const selectedObj = findParent(scene.getObjectById(selectedObject))
  isSelected.current = selectedObj && selectedObj.userData.id === props.id

  const ref = useUpdate(
    self => {
      self.rotation.x = 0
      self.rotation.z = 0
      self.rotation.y = props.rotation || 0

      self.rotateX(props.tilt || 0)
      self.rotateZ(props.roll || 0)
    },
    [props.rotation, props.tilt, props.roll]
  )

  const renderCamera = () => {
    if (virtualCamera.current && renderTarget.current) {
      gl.vr.enabled = false

      hideArray.current.forEach(child => {
        child.visible = false
      })

      gl.render(scene, virtualCamera.current, renderTarget.current)
      gl.vr.enabled = true

      hideArray.current.forEach(child => {
        child.visible = true
      })
    }
  }

  useEffect(() => {
    if (!renderTarget.current) {
      renderTarget.current = new THREE.WebGLRenderTarget(resolution * aspectRatio, resolution)
    }

    if (virtualCamera.current) {
        virtualCamera.current.addEventListener('updateFOV', (e) => setCamSliderFOV(e.fov))
    }
  }, [])

  useEffect(() => {
    hideArray.current = []
    scene.traverse(child => {
      if (
        child.type === 'Line' ||
        child.userData.type === 'virtual-camera' ||
        child.userData.id === 'controller' ||
        child.userData.type === 'gui'
      ) {
        hideArray.current.push(child)
      }
    })
  })

  useRender(() => {
    if (!previousTime.current) previousTime.current = 0

    const currentTime = new Date().getTime()
    const delta = currentTime - previousTime.current

    if (delta > 500) {
      previousTime.current = currentTime
    } else {
      if (!props.guiCamera && !isSelected.current) return
    }

    renderCamera()
  })

  return (
    <group
      userData={{ id: props.id, displayName: props.displayName, type: 'virtual-camera', forPanel: { fov: props.fov } }}
      position={[props.x || 0, props.z || 0, props.y || 0]}
      ref={ref}
    >
      <mesh
        ref={targetMesh}
        userData={{ type: props.guiCamera ? 'gui' : 'view' }}
        geometry={new THREE.PlaneGeometry(size * aspectRatio, size)}
        material={
          new THREE.MeshBasicMaterial({
            map: renderTarget.current ? renderTarget.current.texture : null,
            side: THREE.DoubleSide
          })
        }
      />
      {!props.guiCamera && (
        <mesh
          position={[0, 0, -0.0325]}
          geometry={new THREE.BoxGeometry(size * aspectRatio + padding, size + padding, 0.05)}
          material={new THREE.MeshLambertMaterial({ color: new THREE.Color('gray'), transparent: true })}
        />
      )}
      <group position={props.camOffset || new THREE.Vector3()}>
        <perspectiveCamera
          name={props.guiCamera ? 'guiCam' : '' }
          ref={virtualCamera}
          aspect={aspectRatio}
          fov={camSliderFOV || props.fov}
          near={0.01}
          far={1000}
          onUpdate={self => self.updateProjectionMatrix()}
        />
      </group>
    </group>
  )
}

module.exports = SGVirtualCamera
