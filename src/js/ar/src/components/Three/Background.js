import React, {useEffect} from 'react'

import { useThree } from 'react-three-fiber'

const Background = ({backgroundColor}) => {
  const {gl} = useThree()

  useEffect(() => {
    gl.setClearColor(new THREE.Color(backgroundColor), 1.0)
  }, [backgroundColor, gl])
  
  return null
}

export default Background
