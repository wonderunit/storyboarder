import React, {useEffect} from 'react'
import {connect} from "react-redux"

import {getWorld} from "../../../../shared/reducers/shot-generator"

import { useThree } from 'react-three-fiber'

const Background = ({backgroundColor}) => {
  const {gl} = useThree()

  useEffect(() => {
    gl.setClearColor(new THREE.Color(backgroundColor), 1.0)
  }, [backgroundColor, gl])
  
  return null
}

const mapStateToProps = (state) => ({
  backgroundColor: getWorld(state).backgroundColor
})

export default connect(mapStateToProps)(Background)
