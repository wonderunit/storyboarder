const THREE = require('three')
window.THREE = window.THREE || THREE
const { Canvas, useThree } = require('react-three-fiber')

const { Provider, connect } = require('react-redux')
const React = require('react')
const { useState, useEffect, useRef, useContext } = React

const SceneManagerXR = connect(
  state => ({}),
  {}
)(({ aspectRatio, scene, sceneObjects }) => {
  const SceneContent = () => {
    const camera = useRef()
    const { setDefaultCamera } = useThree()
    useEffect(() => void setDefaultCamera(camera.current), [])

    let components = Object.values(sceneObjects).map((props, i) => {
      switch (props.type) {
        case 'camera':
          return (
            <perspectiveCamera
              key={i}
              ref={camera}
              aspect={aspectRatio}
              fov={props.fov}
              userData={{ type: props.type, id: props.id }}
              position={[props.x, props.y, props.z]}
              rotation={[props.tilt, props.rotation, props.roll]}
              onUpdate={self => self.updateProjectionMatrix()}
            />
          )
      }
    })

    components = components.filter(Boolean)

    return <>{components.map(c => c)}</>
  }

  return (
    <Canvas>
      <SceneContent />
      <mesh
        visible
        userData={{ test: 'hello' }}
        position={new THREE.Vector3(0, 0, -50)}
        rotation={new THREE.Euler(0, 0, 0)}
        geometry={new THREE.SphereGeometry(5, 16, 16)}
        material={
          new THREE.MeshBasicMaterial({ color: new THREE.Color('indianred'), transparent: true, side: THREE.DoubleSide })
        }
      />
    </Canvas>
  )
})

module.exports = SceneManagerXR
