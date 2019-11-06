const { useEffect, useMemo, useRef } = require('react')
const TWEEN = require('@tweenjs/tween.js')

const VirtualCamera = require('../components/VirtualCamera')

const transitionTime = require('../../../utils/transitionTime')

const Image = React.memo(({ sceneObject, isSelected, texture, visibleToCam }) => {
  const aspect = useRef(1)
  const ref = useRef()

  const { x, y, z, visible, height, rotation, opacity } = sceneObject

  const material = useMemo(() => {
    return new THREE.MeshToonMaterial({ transparent: true })
  }, [])

  useMemo(() => {
    if (texture) {
      texture.wrapS = texture.wrapT = THREE.RepeatWrapping
      texture.offset.set(0, 0)
      texture.repeat.set(1, 1)
  
      const { width, height } = texture.image
      aspect.current = width / height
    }

    if (material) material.map = texture
  }, [texture])

  useEffect(() => {
    if (isSelected) {
      material.emissive = new THREE.Color(0x755bf9)
      material.color = new THREE.Color(0x222222)
    } else {
      material.emissive = new THREE.Color(0x000000)
      material.color = new THREE.Color(0xcccccc)
    }
  }, [ref.current, isSelected])

  useEffect(() => {
    material.opacity = opacity
  }, [opacity])

  useEffect(() => {
    if (visibleToCam) ref.current.children.forEach(child => child.layers.enable(VirtualCamera.VIRTUAL_CAMERA_LAYER))
    else ref.current.children.forEach(child => child.layers.disable(VirtualCamera.VIRTUAL_CAMERA_LAYER))
  }, [ref.current, visibleToCam])
  
  let tween
  useEffect(() => {
    if (tween) {
      tween.stop()
    }
    
    if (sceneObject.remoteUpdate) {
      tween = new TWEEN.Tween([
        ref.current.position.x,
        ref.current.position.y,
        ref.current.position.z,
        ref.current.rotation.x,
        ref.current.rotation.y,
        ref.current.rotation.z
      ])
      
      tween.to([
        sceneObject.x,
        sceneObject.z,
        sceneObject.y,
        sceneObject.rotation.x,
        sceneObject.rotation.y,
        sceneObject.rotation.z
      ], transitionTime(ref.current.position, sceneObject))
      
      tween.onUpdate(([x, y, z, rx, ry, rz]) => {
        ref.current.position.set(x, y, z)
        ref.current.rotation.set(rx, ry, rz)
      })
      
      tween.start()
    } else {
      ref.current.position.set(sceneObject.x, sceneObject.z, sceneObject.y)
      ref.current.rotation.set(sceneObject.rotation.x, sceneObject.rotation.y, sceneObject.rotation.z)
    }
  }, [
    ref.current,
    sceneObject.x, sceneObject.y, sceneObject.z,
    sceneObject.rotation.x, sceneObject.rotation.y, sceneObject.rotation.z
  ])
  
  const currentPos = {x, y: z, z: y}
  const currentRot = {x: rotation.x, y: rotation.y, z: rotation.z}
  
  if (ref.current) {
    currentPos.x = ref.current.position.x
    currentPos.y = ref.current.position.y
    currentPos.z = ref.current.position.z
    currentRot.x = ref.current.rotation.x
    currentRot.y = ref.current.rotation.y
    currentRot.z = ref.current.rotation.z
  }

  return (
    <group
      ref={ref}
      onController={sceneObject.visible ? () => null : null}
      userData={{
        type: 'image',
        id: sceneObject.id
      }}
      visible={visible}
      position={[currentPos.x, currentPos.y, currentPos.z]}
      scale={[height * aspect.current, height, 1]}
      rotation={[currentRot.x, currentRot.y, currentRot.z]}
    >
      <mesh>
        <planeBufferGeometry attach="geometry" args={[1, 1]} />
        <primitive attach="material" object={material} />
      </mesh>
      <mesh rotation={[0, Math.PI, 0]} scale={[-1, 1, 1]}>
        <planeBufferGeometry attach="geometry" args={[1, 1, 0.01]} />
        <primitive attach="material" object={material} />
      </mesh>
    </group>
  )
})

module.exports = Image
