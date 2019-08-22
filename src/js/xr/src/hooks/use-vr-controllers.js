const { useThree, useRender } = require('react-three-fiber')
const { useState, useEffect, useRef } = React = require('react')

window.THREE = window.THREE || THREE
require('../../vendor/VRController')

const modifyEvent = (event, gl) => {
  let gamepad = event.target.gamepad
  event.target = gl.vr.getController(event.target.gamepad.index)
  event.target.gamepad = gamepad
  return event
}

const getList = (controllers, gl) =>
  controllers.filter(Boolean).map(c => gl.vr.getController(c.gamepad.index))

const useVrControllers = ({
  onTriggerStart,
  onTriggerEnd,
  onGripDown,
  onGripUp,
  onAxesChanged
}) => {
  const { gl } = useThree()
  const [list, setList] = useState([])

  const onTriggerStartRef = useRef()
  const onTriggerEndRef = useRef()
  const onGripDownRef = useRef()
  const onGripUpRef = useRef()
  const onAxesChangedRef = useRef()

  onTriggerStartRef.current = onTriggerStart
  onTriggerEndRef.current = onTriggerEnd
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
    setList(getList(THREE.VRController.controllers, gl))

    controller.addEventListener('trigger press began', event => onTriggerStartRef.current(modifyEvent(event, gl)))
    controller.addEventListener('trigger press ended', event => onTriggerEndRef.current(modifyEvent(event, gl)))
    controller.addEventListener('grip press began', event => onGripDownRef.current(modifyEvent(event, gl)))
    controller.addEventListener('grip press ended', event => onGripUpRef.current(modifyEvent(event, gl)))
    controller.addEventListener('thumbstick axes changed', event => onAxesChangedRef.current(modifyEvent(event, gl)))
    controller.addEventListener('thumbpad axes changed', event => onAxesChangedRef.current(modifyEvent(event, gl)))
    controller.addEventListener('disconnected', event => {
      console.log('disconnected', event)
      setList(getList(THREE.VRController.controllers, gl))
    })

    // controller.addEventListener('A press ended', event => undo())
    // controller.addEventListener('B press ended', event => redo())
  }

  const onVRControllerDisconnected = event => {
    console.log('onVRControllerDisconnected', event)

    setList(getList(THREE.VRController.controllers, gl))
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
