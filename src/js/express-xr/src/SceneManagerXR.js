const THREE = require('three')
window.THREE = window.THREE || THREE
const { Canvas, useThree } = require('react-three-fiber')

const { Provider, connect } = require('react-redux')
const React = require('react')
const { useState, useEffect, useRef, useContext } = React

const SceneManagerXR = connect(
  state => ({}),
  {}
)(({ aspectRatio, scene, sceneObjects, world }) => {
  const SceneContent = () => {
    const camera = useRef()
    const { setDefaultCamera } = useThree()
    useEffect(() => void setDefaultCamera(camera.current), [])

    useEffect(() => {
      if (camera.current) {
        const { userData } = camera.current
        camera.current.rotation.x = 0
        camera.current.rotation.z = 0
        camera.current.rotation.y = userData.rotation
        camera.current.rotateX(userData.tilt)
        camera.current.rotateZ(userData.roll)
      }
    })

    let components = Object.values(sceneObjects).map((props, i) => {
      switch (props.type) {
        case 'camera':
          return (
            <perspectiveCamera
              key={i}
              ref={camera}
              aspect={aspectRatio}
              fov={props.fov}
              userData={{
                type: props.type,
                id: props.id,
                rotation: props.rotation,
                tilt: props.tilt,
                roll: props.roll
              }}
              position={[props.x, props.z, props.y]}
              onUpdate={self => self.updateProjectionMatrix()}
            />
          )
      }
    })

    components = components.filter(Boolean)

    return <>{components.map(c => c)}</>
  }

  const WorldContent = () => {
    const ambientLight = useRef(null)
    const directionalLight = useRef(null)
    const ground = useRef(null)

    useEffect(() => {
      if (directionalLight.current) {
        directionalLight.current.target.position.set(0, 0, 0.4)
        directionalLight.current.add(directionalLight.current.target)
        directionalLight.current.rotation.x = 0
        directionalLight.current.rotation.z = 0
        directionalLight.current.rotation.y = world.directional.rotation
        directionalLight.current.rotateX(world.directional.tilt + Math.PI / 2)
      }
    })

    return (
      <>
        <ambientLight ref={ambientLight} color={0xffffff} intensity={world.ambient.intensity} />
        <directionalLight
          ref={directionalLight}
          color={0xffffff}
          intensity={world.directional.intensity}
          position={[0, 1.5, 0]}
        />
        <mesh
          ref={ground}
          visible={!world.room.visible}
          userData={{ type: 'ground' }}
          position={new THREE.Vector3(0, -0.03, 0)}
          rotation={new THREE.Euler(-Math.PI / 2, 0, 0)}
          geometry={new THREE.PlaneGeometry(135 / 3, 135 / 3, 32)}
          material={new THREE.MeshToonMaterial({ side: THREE.FrontSide })}
        />
      </>
    )
  }

  return (
    <Canvas style={{ background: `#${new THREE.Color(world.backgroundColor).getHexString()}` }}>
      <SceneContent />
      <WorldContent />
      <mesh
        visible
        userData={{ test: 'hello' }}
        position={new THREE.Vector3(0, 1.75 / 2, 0)}
        rotation={new THREE.Euler(0, 0, 0)}
        geometry={new THREE.SphereGeometry(0.5, 16, 16)}
        material={
          new THREE.MeshStandardMaterial({ color: new THREE.Color('white'), transparent: true, side: THREE.DoubleSide })
        }
      />
    </Canvas>
  )
})

module.exports = SceneManagerXR
