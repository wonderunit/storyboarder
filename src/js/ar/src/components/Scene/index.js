import React, {useRef, useMemo, useState} from 'react'
import {connect} from "react-redux"

import {useController, useHitTestManager} from "../../hooks/useController"
import {getSceneObjects, getWorld} from "../../../../shared/reducers/shot-generator"
import {useAsset} from "../../../../shot-generator/hooks/use-assets-manager"
import getFilepathForModelByType from "../../../../xr/src/helpers/get-filepath-for-model-by-type"
import {useFrame} from "react-three-fiber"

const Scene = ({sceneObjects, world}) => {
  const [sceneVisible, setSceneVisible] = useState(false)
  
  const meshRef = useRef(null)

  useController(({reticle, target}) => {
    meshRef.current.position.setFromMatrixPosition(reticle.matrix)
    meshRef.current.quaternion.setFromRotationMatrix(reticle.matrix)
    //meshRef.current.scale.setFromMatrixScale(reticle.matrix)
    meshRef.current.updateWorldMatrix(false, true)
    
    if (!sceneVisible) {
      setSceneVisible(true)
    }
  })

  useHitTestManager()

  let envPath = world.environment.file 
    ? getFilepathForModelByType({
      type: 'environment',
      model: world.environment.file
    })
    : null
  const {asset: env} = useAsset(envPath)
  
  const envObj = useMemo(() => {
    let g = new THREE.Group()
    
    if (!env) {
      return g
    }
    
    env.scene.traverse(child => {
      if (child.isMesh) {
        let obj = child.clone()
        console.log(obj)
        g.add(obj)
      }
    })
    
    return g
  }, [env])
  
  // useFrame(() => {
  //   if (envObj) {
  //     envObj.position.y = meshRef.current.position.y
  //   }
  // })
  
  return (
    <group
      ref={meshRef}
      scale={[0.02, 0.02, 0.02]}
      visible={sceneVisible}
    >
      <pointLight position={[10, 10, 10]} />
      <ambientLight
        color={ 0xffffff }
        intensity={ world.ambient.intensity }
      />
      <primitive object={envObj}/>
    </group>
  )
}

const mapStateToProps = (state) => ({
  sceneObjects: getSceneObjects(state),
  world: getWorld(state),
  board: state.board
})

export default connect(mapStateToProps)(Scene)
