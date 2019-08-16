const { useThree, useRender } = require('react-three-fiber')
const { useState, useEffect, useRef } = React = require('react')

window.THREE = window.THREE || THREE
require('../../vendor/VRController')

const useVrControllers = ({
  // onSelectStart,
  // onSelectEnd,
  // onGripDown,
  // onGripUp,
  onAxesChanged
}) => {
  const { gl } = useThree()
  const [list, setList] = useState([])

  // const onSelectStartRef = useRef(onSelectStart)
  // const onSelectEndRef = useRef(onSelectEnd)

  // const onGripDownRef = useRef(onGripDown)
  // const onGripUpRef = useRef(onGripUp)

  const onAxesChangedRef = useRef(onAxesChanged)

  useRender(() => {
    THREE.VRController.update()
  })

  const onVRControllerConnected = event => {
    let controller = event.detail
    controller.standingMatrix = gl.vr.getStandingMatrix()
    setList(THREE.VRController.controllers)

    // controller.addEventListener('trigger press began', (...rest) => onSelectStartRef.current(...rest))
    // controller.addEventListener('trigger press ended', (...rest) => onSelectEndRef.current(...rest))
    // controller.addEventListener('grip press began', (...rest) => onGripDownRef.current(...rest))
    // controller.addEventListener('grip press ended', (...rest) => onGripUpRef.current(...rest))
    controller.addEventListener('thumbstick axes changed', (...rest) => onAxesChangedRef.current(...rest))
    controller.addEventListener('thumbpad axes changed', (...rest) => onAxesChangedRef.current(...rest))

    // controller.addEventListener('A press ended', event => undo())
    // controller.addEventListener('B press ended', event => redo())
  }

  const onVRControllerDisconnected = event => {
    let controller = event.detail
    setList(THREE.VRController.controllers)
  }

  useEffect(() => {
    window.addEventListener('vr controller connected', onVRControllerConnected)
    window.addEventListener('vr controller disconnected', onVRControllerDisconnected)
    return () => {
      window.removeEventListener('vr controller connected', onVRControllerConnected)
      window.removeEventListener('vr controller disconnected', onVRControllerDisconnected)
    }
  }, [])

  return list
}

module.exports = useVrControllers
