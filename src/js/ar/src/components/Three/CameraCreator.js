import React, {useContext} from 'react'
import { useFrame } from 'react-three-fiber'
import { Euler, Vector3 } from 'three'
import { createObject } from '../../../../shared/reducers/shot-generator'
import { SceneState } from '../../helpers/sceneState'
import { Connection, Store } from '../../helpers/store'


let cameraOrigin = new Vector3()
let cameraRotation = new Euler()
cameraRotation.order = "YXZ";

const CameraCreator = ({}) => {
  const [currentSceneState, setSceneState] = useContext(SceneState)

  useFrame(({camera, gl}) => {
    if (currentSceneState.shouldCreateCamera) {
      gl.xr.isPresenting && gl.xr.getCamera(camera)

      cameraOrigin.setFromMatrixPosition( camera.matrixWorld )
      cameraRotation.setFromRotationMatrix( camera.matrixWorld )

      let { x, y, z } = cameraOrigin
      let rotation = cameraRotation.y
      let tilt = cameraRotation.x
      let roll = cameraRotation.z

      let object = {
        type: 'camera',

        fov: camera.fov,

        x, y: z, z: y,
        rotation, tilt, roll
      }

      Store.current.dispatch(createObject(object))

      setSceneState({
        ...currentSceneState,
        shouldCreateCamera: false
      })
    }
  })
  
  return null
}


export default CameraCreator
