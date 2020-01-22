import { connect } from 'react-redux'
import React, { useEffect, useMemo } from 'react'
import { getScene } from './utils/scene'
import { render } from 'react-three-fiber'
import ModelObject from './components/Three/ModelObject'
import { createSelector } from 'reselect'
import { getSceneObjects } from '../shared/reducers/shot-generator'
import FatalErrorBoundary from './components/FatalErrorBoundary'

const getSceneObjectModelObjectIds = createSelector(
    [getSceneObjects],
    sceneObjects => Object.values(sceneObjects).filter(o => o.type === 'object').map(o => o.id)
  )

const SceneRender = connect(
    state => ({
        sceneObjects: getSceneObjects(state),
        modelObjectIds: getSceneObjectModelObjectIds(state)
    }),
    {
    }
)(
    React.memo(({ 
        sceneObjects,
        modelObjectIds
    }) => {
        const scene = useMemo(() => {
            console.log(getScene())
            console.log(sceneObjects)
            console.log(modelObjectIds)
            return getScene()
        }, [ sceneObjects])

        scene && modelObjectIds.length && render(
                    <ModelObject
                        key={ sceneObjects[modelObjectIds[0]].id }
                        gltf={ null }
                        sceneObject={ sceneObjects[modelObjectIds[0]] }/>
            , scene
        )
    }
))

export default SceneRender
