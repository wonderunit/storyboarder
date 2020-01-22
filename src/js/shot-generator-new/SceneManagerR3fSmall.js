import { connect } from 'react-redux'
import React, { useRef, useEffect, useCallback } from 'react'

import { getSceneObjects } from '../shared/reducers/shot-generator'
import { createSelector } from 'reselect'
import { useThree } from 'react-three-fiber'
import IconsComponent from './components/IconsComponent'
const getSceneObjectModelObjectIds = createSelector(
    [getSceneObjects],
    sceneObjects => Object.values(sceneObjects).filter(o => o.type === 'object').map(o => o.id)
  )

const SceneManagerR3fSmall = connect(
    state => ({
        modelObjectIds: getSceneObjectModelObjectIds(state),
        sceneObjects: getSceneObjects(state)
    }),
    {

    }
)( React.memo(({ 
    modelObjectIds,
    sceneObjects

}) => {
    const { scene, camera } = useThree()
    const rootRef = useRef()
    const groundRef = useRef()

    const autofitOrtho = useCallback(() => {
      let minMax = [9999,-9999,9999,-9999]
        
      // go through all appropriate objects and get the min max
      let numVisible = 0
      for (let child of scene.children[0].children) {

        if (
            child.userData &&
            child.userData.type === 'object' ||
            child.userData.type === 'character' ||
            child.userData.type === 'light' ||
            child.userData.type === 'volume' ||
            child.userData.type === 'image' ||
            child instanceof THREE.PerspectiveCamera
        ) {
          minMax[0] = Math.min(child.position.x, minMax[0])
          minMax[1] = Math.max(child.position.x, minMax[1])
          minMax[2] = Math.min(child.position.z, minMax[2])
          minMax[3] = Math.max(child.position.z, minMax[3])
          numVisible++
        }
      }
    
      // if only one object is in the scene (a single camera)
      if (numVisible === 1) {
        // add some extra padding
        minMax[0] -= 2
        minMax[1] += 2
        minMax[2] -= 2
        minMax[3] += 2
      }
    
      // add some padding
      minMax[0] -= 2
      minMax[1] += 2
      minMax[2] -= 2
      minMax[3] += 2
    
      // get the aspect ratio of the container window
      // target aspect ratio
      let rs = 1
     
    
      // make sure the min max box fits in the aspect ratio
      let mWidth = minMax[1]-minMax[0]
      let mHeight = minMax[3]-minMax[2]
      let mAspectRatio = (mWidth/mHeight)
    
      if (mAspectRatio>rs) {
        let padding = (mWidth / rs)-mHeight
        minMax[2] -= padding/2
        minMax[3] += padding/2
      } else {
        let padding = (mHeight / (1/rs))-mWidth
        minMax[0] -= padding/2
        minMax[1] += padding/2
      }
    
      camera.position.x = minMax[0]+((minMax[1]-minMax[0])/2)
      camera.position.z = minMax[2]+((minMax[3]-minMax[2])/2)
      camera.left = -(minMax[1]-minMax[0])/2
      camera.right = (minMax[1]-minMax[0])/2
      camera.top = (minMax[3]-minMax[2])/2
      camera.bottom = -(minMax[3]-minMax[2])/2
      camera.near = -1000
      camera.far = 1000
    
      camera.updateProjectionMatrix()
      console.log(camera)
    }, [scene, camera])

    useEffect(() => {
        camera.position.y = 900
        camera.rotation.x = -Math.PI / 2
        camera.layers.enable(2)
        camera.updateMatrixWorld(true)
    }, [camera, sceneObjects])

    useEffect(autofitOrtho, [sceneObjects])

    console.log(scene)
    return <group ref={rootRef}> 
    {
        modelObjectIds.map(( object, index) => {
            let sceneObject = sceneObjects[object]
            return <IconsComponent
                key={ index }
                type={ sceneObject.type }
                text=""
                sceneObject={ sceneObject } />
        })
    }
    
    </group>

    })
)
export default SceneManagerR3fSmall
