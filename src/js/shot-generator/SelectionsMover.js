const { useLayoutEffect, useEffect, useRef } = React = require('react')
const { connect } = require('react-redux')

const {
  updateObjects,
  getSelections
} = require('../shared/reducers/shot-generator')

const SelectionsMover = connect(
  state => ({
    selections: getSelections(state),
    devices: state.devices
  }),
  {
    updateObjects
  }
)(
({
  scene,
  camera,

  selections,
  devices,

  updateObjects
}) => {
  const moveSpeed = useRef(0.001)
  const callback = useRef()

  const moveSelectedObjects = offset => {
    let changes = {}
    for (selection of selections) {
      let target = scene.children.find(child => child.userData.id === selection)
      if (target) {
        let pos = new THREE.Vector2(
          target.position.x + offset.x,
          target.position.z + offset.y
        ).rotateAround(
          new THREE.Vector2(
            target.position.x,
            target.position.z
          ),
          -camera.rotation.y
        )
        changes[selection] = { x: pos.x, y: pos.y }
      }
    }
    if (Object.keys(changes).length) {
      updateObjects(changes)
    }
  }

  const onFrame = () => {
    let offset = { x: 0, y: 0 }

    let controller = devices[0]

    if (
      controller.digital.left ||
      controller.digital.right ||
      controller.digital.up ||
      controller.digital.down
    ) {

      if (controller.digital.left) {
        offset.x = -moveSpeed.current
      }

      if (controller.digital.right) {
        offset.x = +moveSpeed.current
      }

      if (controller.digital.up) {
        offset.y = -moveSpeed.current
      }

      if (controller.digital.down) {
        offset.y = +moveSpeed.current
      }

      moveSelectedObjects(offset)
      moveSpeed.current = moveSpeed.current + 0.0005

    } else {
      moveSpeed.current = 0.0001
    }
  }

  useLayoutEffect(() => {
    let raf

    const loop = () => {
      onFrame()
      raf = requestAnimationFrame(loop)
    }
    loop()

    return function cleanup () {
      cancelAnimationFrame(raf)
    }
  }, [selections, devices, camera])

  return null
})

module.exports = SelectionsMover
