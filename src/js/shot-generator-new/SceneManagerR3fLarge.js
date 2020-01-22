import { connect } from 'react-redux'
import ModelObject from './components/Three/ModelObject'
import React, { useRef, useEffect } from 'react'

import { getSceneObjects } from '../shared/reducers/shot-generator'
import { createSelector } from 'reselect'
import { useThree } from 'react-three-fiber'
const getSceneObjectModelObjectIds = createSelector(
    [getSceneObjects],
    sceneObjects => Object.values(sceneObjects).filter(o => o.type === 'object').map(o => o.id)
  )

const SceneManagerR3fLarge = connect(
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
    const { camera } = useThree()
    const rootRef = useRef()
    const groundRef = useRef()


    return <group ref={rootRef}> 
    {
        modelObjectIds.map(object => {
            return <ModelObject
                key={ sceneObjects[object].id }
                gltf={ null }
                sceneObject={ sceneObjects[object] }/>
        })
    }
    
    </group>

    })
)
export default SceneManagerR3fLarge
