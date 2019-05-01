const { useUpdate, useThree, useRender } = require('../lib/react-three-fiber')
const React = require('react')
const { useEffect, useRef } = React

const SGVirtualCamera = ({ i, aspectRatio, ...props }) => {
  const virtualCamera = useRef(null)
  const renderTarget = useRef(null)
  const targetMesh = useRef(null)

  const size = 0.5
  const padding = 0.05
  const resolution = 512

  const { gl, scene } = useThree()

  const ref = useUpdate(
    self => {
      self.rotation.x = 0
      self.rotation.z = 0
      self.rotation.y = props.rotation

      self.rotateX(props.tilt)
      self.rotateZ(props.roll)
    },
    [props.rotation, props.tilt, props.roll]
  )

  useEffect(() => {
    if (!renderTarget.current) {
      renderTarget.current = new THREE.WebGLRenderTarget(resolution * aspectRatio, resolution)
    }
  }, [])

  useRender(() => {
    if (virtualCamera.current && renderTarget.current) {
      gl.vr.enabled = false
      gl.render(scene, virtualCamera.current, renderTarget.current)
      gl.vr.enabled = true
    }
  })

  return (
    <group userData={{ type: props.type, id: props.id }} position={[props.x, props.z, props.y]} ref={ref}>
      <mesh
        ref={targetMesh}
        geometry={new THREE.PlaneGeometry(size * aspectRatio, size)}
        material={
          new THREE.MeshBasicMaterial({
            map: renderTarget.current ? renderTarget.current.texture : null,
            side: THREE.DoubleSide
          })
        }
      />
      <mesh
        position={[0, 0, -0.0275]}
        geometry={new THREE.BoxGeometry(size * aspectRatio + padding, size + padding, 0.05)}
        material={new THREE.MeshBasicMaterial({ color: new THREE.Color('black'), transparent: true })}
      />
      <perspectiveCamera
        ref={virtualCamera}
        aspect={aspectRatio}
        fov={props.fov}
        near={0.01}
        far={1000}
        onUpdate={self => self.updateProjectionMatrix()}
      />
    </group>
  )
}

module.exports = SGVirtualCamera
