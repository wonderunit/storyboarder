import React, {useMemo, useEffect} from 'react'
import {connect} from "react-redux"

import {getWorld} from "../../../../shared/reducers/shot-generator"

import vertex from './../../shaders/env_vert.glsl'
import fragment from './../../shaders/env_frag.glsl'

const Background = ({backgroundColor}) => {
  const mesh = useMemo(() => {
    const cubeShader = THREE.ShaderLib[ 'cube' ]

    const uniforms = THREE.UniformsUtils.clone( cubeShader.uniforms )
    uniforms.color = {value: new THREE.Color()}

    const cubeMaterial = new THREE.ShaderMaterial({
      uniforms,
      fragmentShader: fragment,
      vertexShader: vertex,
      depthWrite: false,
      side: THREE.BackSide
    })

    //cubeMaterial.envMap = new THREE.CubeTexture()

    return new THREE.Mesh(
      new THREE.CubeGeometry(2, 2, 2),
      cubeMaterial
    )
  }, [])

  useEffect(() => {
    if (backgroundColor) {
      mesh.material.uniforms.color.value = new THREE.Color(backgroundColor)
    }
  }, [backgroundColor, mesh])
  
  return (
    <primitive
      object={mesh}
      frustumCulled={false}
    />
  )
}

const mapStateToProps = (state) => ({
  backgroundColor: getWorld(state).backgroundColor
})

export default connect(mapStateToProps)(Background)
