const { useThree, useRender } = require('react-three-fiber')
const { useState, useEffect, useRef } = React = require('react')

window.THREE = window.THREE || THREE
require('../../vendor/VRController')

const useVrControllers = ({
  onSelectStart,
  onSelectEnd,
  onGripDown,
  onGripUp,
  onAxesChanged
}) => {
  const { gl } = useThree()
  const [list, setList] = useState([])

  const onSelectStartRef = useRef()
  const onSelectEndRef = useRef()
  const onGripDownRef = useRef()
  const onGripUpRef = useRef()
  const onAxesChangedRef = useRef()

  onSelectStartRef.current = onSelectStart
  onSelectEndRef.current = onSelectEnd
  onGripDownRef.current = onGripDown
  onGripUpRef.current = onGripUp
  onAxesChangedRef.current = onAxesChanged

  useRender(() => {
    THREE.VRController.update()
  })

  const onVRControllerConnected = event => {
    console.log('onVRControllerConnected', event)

    let controller = event.detail
    controller.standingMatrix = gl.vr.getStandingMatrix()
    controller.pressed = false
    controller.gripped = false
    setList([...THREE.VRController.controllers.filter(Boolean)])

    controller.addEventListener('trigger press began', (...rest) => onSelectStartRef.current(...rest))
    controller.addEventListener('trigger press ended', (...rest) => onSelectEndRef.current(...rest))
    controller.addEventListener('grip press began', (...rest) => onGripDownRef.current(...rest))
    controller.addEventListener('grip press ended', (...rest) => onGripUpRef.current(...rest))
    controller.addEventListener('thumbstick axes changed', (...rest) => onAxesChangedRef.current(...rest))
    controller.addEventListener('thumbpad axes changed', (...rest) => onAxesChangedRef.current(...rest))
    controller.addEventListener('disconnected', event => {
      console.log('disconnected', event)
      setList([...THREE.VRController.controllers.filter(Boolean)])
    })

    // controller.addEventListener('A press ended', event => undo())
    // controller.addEventListener('B press ended', event => redo())
  }

  const onVRControllerDisconnected = event => {
    console.log('onVRControllerDisconnected', event)

    let controller = event.detail
    setList([...THREE.VRController.controllers.filter(Boolean)])
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
