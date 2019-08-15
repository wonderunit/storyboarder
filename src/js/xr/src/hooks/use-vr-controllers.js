const { useThree, useRender } = require('react-three-fiber')
const { useState, useEffect } = React = require('react')

window.THREE = window.THREE || THREE
require('../../vendor/VRController')

const useVrControllers = () => {
  const { gl } = useThree()
  const [list, setList] = useState([])

  useRender(() => {
    THREE.VRController.update()
  })

  const onVRControllerConnected = event => {
    let controller = event.detail
    controller.standingMatrix = gl.vr.getStandingMatrix()
    setList(THREE.VRController.controllers)
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
