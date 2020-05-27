import {connect} from 'react-redux'
import React, {useMemo} from 'react'
import ColorSelect from '../../ColorSelect'
import {
    getSelections,
    getSceneObjects,
    updateObject
  } from './../../../../shared/reducers/shot-generator'
import {formatters, NumberSlider, transforms, textFormatters, textConstraints} from '../../NumberSlider'
import deepEqualSelector from './../../../../utils/deepEqualSelector'
const getObjectData = deepEqualSelector([getSelections, getSceneObjects], (selections, sceneObjects) => {
    return sceneObjects[selections[0]]
})

const MeshInspector = connect((state) => ({
    sceneObject: getObjectData(state)
}), 
{
    updateObject
}
)( 
React.memo(({
    updateObject,
    sceneObject
}) => {
    console.log(sceneObject)

    const setSize = (value) => {
        updateObject(sceneObject.id, {mesh: {...sceneObject.mesh, size: value}})
    }

    const setColor = (value) => {
        updateObject(sceneObject.id, {mesh: {...sceneObject.mesh, color: value}})
    }

    return (
        <React.Fragment>
            
            <NumberSlider 
                label="Size"
                value={sceneObject.mesh.size} 
                min={0.5} 
                max={15} 
                onSetValue={setSize}
                textConstraint={ textConstraints.sizeConstraint }/>
          
            <ColorSelect
                label="mesh color"
                value={sceneObject.mesh.color}
                onSetValue={setColor}/>
        </React.Fragment>
      )
}))

export default MeshInspector