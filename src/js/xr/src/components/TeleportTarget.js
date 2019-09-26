const { useRef, useEffect } = React = require('react')
const { useMemoOne } = require('use-memo-one')

const selector = state => ({
  teleportTargetPos: state.teleportTargetPos,
  teleportTargetValid: state.teleportTargetValid
})

const TeleportTarget = ({ api, gltf, isDragging }) => {
  const ref = useRef()

  // for performance reasons,
  // subscribe to state changes immediately,
  // and update the ref directly
  useEffect(
    () => {
      ref.current.visible = false

      return api.subscribe(
        state => {
          ref.current.position.set(...state.teleportTargetPos)

          let visible = isDragging != null && state.teleportTargetValid == true
          ref.current.visible = visible
        },
        { selector })
    },
    [isDragging]
  )

  const materialFactory = () => new THREE.MeshToonMaterial({
    color: 0xcccccc,
    emissive: 0x0,
    specular: 0x0,
    reflectivity: 0x0,
    skinning: false,
    shininess: 0,
    flatShading: false,
    morphNormals: false,
    morphTargets: false
  })

  const mesh = useMemoOne(
    () => {
      let mesh = gltf.scene.children[0].clone()

      let material = new THREE.MeshBasicMaterial({depthTest: false, depthWrite: false, opacity: 0.7, flatShading: true, toneMapped: false})

      if (mesh.material.map) {
        let map = mesh.material.map
        material.color = new THREE.Color( 0x8c78f1 ) // 0x755bf9) // 0x856dff )
        material.alphaMap = map
        material.transparent = true
      }
      mesh.material = material
      return mesh
    },
    [gltf]
  )

  return <group ref={ref} visible={false}>
    <primitive object={mesh} />
  </group>
}

module.exports = TeleportTarget
