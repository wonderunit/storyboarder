const THREE = require('three')
window.THREE = window.THREE || THREE
const { Canvas, useThree } = require('react-three-fiber')

const { connect } = require('react-redux')
const React = require('react')
const { useEffect, useRef, useMemo } = React

const { WEBVR } = require('../../vendor/three/examples/js/vr/WebVR')

const SceneManagerXR = connect(
  state => ({}),
  {}
)(({ aspectRatio, sceneObjects, world }) => {
  const groundTexture = useMemo(() => new THREE.TextureLoader().load('/data/system/grid_floor.png'), [])

  const SceneContent = () => {
    const camera = useRef(null)
    const renderer = useRef(null)
    const xrOffset = useRef(null)

    const { gl, scene, setDefaultCamera } = useThree()
    useEffect(() => void setDefaultCamera(camera.current), [])

    useEffect(() => {
      if (!renderer.current) {
        renderer.current = gl

        gl.vr.enabled = true
        document.body.appendChild(WEBVR.createButton(gl))

        // controllers
        controller1 = renderer.current.vr.getController(0)
        xrOffset.current.add(controller1)

        controller2 = renderer.current.vr.getController(1)
        xrOffset.current.add(controller2)

        const geometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -1)])

        const line = new THREE.Line(geometry)
        line.name = 'line'
        line.scale.z = 5
        controller1.add(line.clone())
        controller2.add(line.clone())
      }
    })

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
            <group key={i} ref={xrOffset} position={[props.x, props.z, props.y]}>
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
                onUpdate={self => self.updateProjectionMatrix()}
              />
            </group>
          )
      }
    })

    components = components.filter(Boolean)

    return <>{components.map(c => c)}</>
  }

  const WorldContent = ({ groundTexture }) => {
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
      texture.image && <mesh
          ref={ground}
          visible={!world.room.visible}
          userData={{ type: 'ground' }}
          position={new THREE.Vector3(0, -0.03, 0)}
          rotation={new THREE.Euler(-Math.PI / 2, 0, 0)}
          geometry={new THREE.PlaneGeometry(135 / 3, 135 / 3, 32)}
        >
          <meshToonMaterial attach="material" side={THREE.FrontSide}>
            <primitive attach="map" object={groundTexture} />
          </meshToonMaterial>
        </mesh>
        />
      </>
    )
  }

  return (
    <Canvas style={{ background: `#${new THREE.Color(world.backgroundColor).getHexString()}` }}>
      <SceneContent />
      <WorldContent groundTexture={groundTexture} />
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
