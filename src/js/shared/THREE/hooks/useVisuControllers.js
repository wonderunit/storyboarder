
import * as THREE from 'three'
import { useEffect, useState } from "react"

const identMatrix4 = new THREE.Matrix4()
const LC = new THREE.Matrix4()
const RC = new THREE.Matrix4()

const useVisuControllers = (props) => {

  const { controllers } = props

  const [visuLC, setVisuLC] = useState(true)
  const [visuRC, setVisuRC] = useState(true)

  useEffect(() => {

    if (controllers.length){

      RC.elements = [...controllers[0]]
      LC.elements = [...controllers[1]]
    
      if (visuLC && identMatrix4.equals(LC)){
        setVisuLC(false)
      } else if (!visuLC && !identMatrix4.equals(LC)){
        setVisuLC(true)
      }
    
      if (visuRC && identMatrix4.equals(RC)){
        setVisuRC(false)
      } else if (!visuRC && !identMatrix4.equals(RC)){
        setVisuRC(true)
      }

    }

  }, [controllers])

  return {
    visuLC,
    visuRC
  }
}

export default useVisuControllers