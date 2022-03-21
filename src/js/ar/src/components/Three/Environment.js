import React from 'react'
import {connect} from 'react-redux'

import {getWorld} from "../../../../shared/reducers/shot-generator"

import getFilepathForModelByType from "../../../../xr/src/helpers/get-filepath-for-model-by-type"
import useGLTFAsset from "../../hooks/useGLTFAsset"
import useModelAsset from '../../hooks/useModelAsset'

const Environment = ({getAsset, ...props}) => {
  const env = getAsset(props.file)

  // const envObj = useGLTFAsset(env ? env.scene : null)
  const envObj = useModelAsset(env)
  
  return (
    <primitive
      object={envObj}
      
      visible={props.visible}

      position={[props.x, props.z, props.y]}
      scale={[props.scale, props.scale, props.scale]}
      rotation-y={[props.rotation]}
    />
  )
}

const mapStateToProps = (state) => {
  const env = getWorld(state).environment

  const envPath = env.file
    ? getFilepathForModelByType({
      type: 'environment',
      model: env.file
    })
    : null
  
  return {
    ...env,
    file: envPath
  }
}
  


export default connect(mapStateToProps)(Environment)
