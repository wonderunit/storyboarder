const { useUpdate, useThree, useRender } = require('react-three-fiber')
const React = require('react')
const { useEffect, useRef, useState, useMemo } = React
const { findParent, updateObjectHighlight } = require('../utils/xrHelperFuncs')

const SGVirtualCamera = ({ i, aspectRatio, selectedObject, hideArray, virtualCamVisible, modelData, isSelected, ...props }) => {
  const [camSliderFOV, setCamSliderFOV] = useState(null)

  const previousTime = useRef([null])

  const virtualCamera = useRef(null)
  const renderTarget = useRef(null)
  const hideArrayRef = useRef([])

  const size = props.size || 1 / 3
  const padding = 0.05
  const resolution = 512

  const children = useMemo(() => {
    let children = []
    let index = 0

    if (modelData) {
      modelData.scene.traverse(child => {
        if (child instanceof THREE.Mesh) {
          children.push(<primitive key={`${props.id}-${index}`} object={child.clone()} />)
          index++
        }
      })
    }
    return children
  }, [modelData])

  const { gl, scene } = useThree()
  const worldScaleGroup = scene.children.find(child => child.userData.type === 'world-scale')
  const selectedObj = worldScaleGroup ? findParent(worldScaleGroup.children.find(child => child.userData.id === selectedObject)) : undefined

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

  useMemo(() => {
    renderTarget.current = new THREE.WebGLRenderTarget(resolution * aspectRatio, resolution)
  }, [])
  const heightShader = useMemo(
    () => new THREE.MeshBasicMaterial({
      map: renderTarget.current,
      side: THREE.FrontSide,
    }),
    [renderTarget.current]
  )

  const renderCamera = () => {
    if (virtualCamera.current && renderTarget.current) {
      gl.vr.enabled = false

      for (let i = 0; i < hideArrayRef.current.length; i++) {
        hideArrayRef.current[i].visible = false
      }

      gl.setRenderTarget(renderTarget.current)
      gl.render(scene, virtualCamera.current)
      gl.setRenderTarget(null)

      for (let i = 0; i < hideArrayRef.current.length; i++) {
        hideArrayRef.current[i].visible = true
      }

      gl.vr.enabled = true
    }
  }

  useEffect(() => {
    hideArrayRef.current = hideArray
  }, [hideArray])

  useEffect(() => {
    if (virtualCamera.current) {
      virtualCamera.current.addEventListener('updateFOV', e => setCamSliderFOV(e.fov))
    }
  }, [])

  useEffect(() => {
    if (virtualCamera.current && camSliderFOV) {
      virtualCamera.current.setFocalLength(camSliderFOV)
    }
  }, [camSliderFOV])

  useRender(() => {
    if (!previousTime.current) previousTime.current = 0

    const currentTime = Date.now()
    const delta = currentTime - previousTime.current

    if (delta > 500) {
      previousTime.current = currentTime
    } else {
      if (!props.guiCamera && !isSelected) return
    }

    renderCamera()
  }, false, [isSelected])

  useEffect(() => {
    if (!ref.current) return
    if (isSelected) updateObjectHighlight(ref.current, 0.3)
    else updateObjectHighlight(ref.current, 0.15)
  }, [isSelected])

  return (
    <group
      userData={{
        id: props.id,
        displayName: props.name || props.displayName,
        type: 'virtual-camera',
        camera: virtualCamera.current,
        forPanel: { fov: virtualCamera.current ? virtualCamera.current.getFocalLength() : 0 }
      }}
      position={[props.x || 0, props.z || 0, props.y || 0]}
      ref={ref}
    >
      <group visible={virtualCamVisible || props.guiCamera === true}>
        <mesh
          userData={{ type: props.guiCamera ? 'gui' : 'view' }}
          position={[0, props.guiCamera ? 0 : 0.3, 0]}
          material={heightShader}
        >
          <planeGeometry attach="geometry" args={[size * aspectRatio, size]} />
        </mesh>
        {children}
        {!props.guiCamera && (
          <mesh
            position={[0, 0.3, 0]}
            rotation={[0, Math.PI, 0]}
            userData={{ type: props.guiCamera ? 'gui' : 'view' }}
            material={heightShader}
          >
            <planeGeometry attach="geometry" args={[size * aspectRatio, size]} />
          </mesh>
        )}
        <group>
          <mesh
            position={[(size * aspectRatio + (props.guiCamera ? 0.003 : 0.009)) * -0.5, props.guiCamera ? 0 : 0.3, 0]}
            material={new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, color: 0x7a72e9, opacity: 0.5, transparent: true })}
          >
            <planeGeometry attach="geometry" args={[props.guiCamera ? 0.003 : 0.009, size]} />
          </mesh>
          <mesh
            position={[(size * aspectRatio + (props.guiCamera ? 0.003 : 0.009)) * 0.5, props.guiCamera ? 0 : 0.3, 0]}
            material={new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, color: 0x7a72e9, opacity: 0.5, transparent: true })}
          >
            <planeGeometry attach="geometry" args={[props.guiCamera ? 0.003 : 0.009, size]} />
          </mesh>
          <mesh
            position={[0, (props.guiCamera ? 0 : 0.3) + (size + (props.guiCamera ? 0.003 : 0.009)) * -0.5, 0]}
            material={new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, color: 0x7a72e9, opacity: 0.5, transparent: true })}
          >
            <planeGeometry
              attach="geometry"
              args={[size * aspectRatio + (props.guiCamera ? 0.003 : 0.009) * 2, props.guiCamera ? 0.003 : 0.009]}
            />
          </mesh>
          <mesh
            position={[0, (props.guiCamera ? 0 : 0.3) + (size + (props.guiCamera ? 0.003 : 0.009)) * 0.5, 0]}
            material={new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, color: 0x7a72e9, opacity: 0.5, transparent: true })}
          >
            <planeGeometry
              attach="geometry"
              args={[size * aspectRatio + (props.guiCamera ? 0.003 : 0.009) * 2, props.guiCamera ? 0.003 : 0.009]}
            />
          </mesh>
        </group>
        <group position={props.camOffset || new THREE.Vector3()}>
          <perspectiveCamera
            name={props.guiCamera ? 'guiCam' : ''}
            ref={virtualCamera}
            aspect={aspectRatio}
            fov={props.fov}
            near={0.01}
            far={1000}
            onUpdate={self => self.updateProjectionMatrix()}
          />
          {props.children}
        </group>
      </group>
    </group>
  )
}

module.exports = SGVirtualCamera
