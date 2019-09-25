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

  const mesh = useMemoOne(
    () => gltf.scene.children[0].clone(),
    [gltf]
  )

  return <group ref={ref}>
    <primitive object={mesh} />
  </group>
}

module.exports = TeleportTarget
