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
import MeshType from '../../Three/Helpers/Meshes/TextureMeshTypes'
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

    const setType = (event) => {
        updateObject(sceneObject.id, {mesh: {...sceneObject.mesh, type: event.target.value}})
    }

    return (
        <React.Fragment>
            <div className="row" style={{ margin: "9px 0 6px 0", paddingRight: 0 }}> 
                <div style={{ width: 50, display: "flex", alignSelf: "center" }}>Type</div>
                <select required={ true }
                  value={ sceneObject.mesh.type || MeshType.SIMPLE }
                  onChange={ setType }
                  style={{ flex: 1,
                        marginBottom: 0,
                        maxWidth: 192 }}>
                    { Object.values(MeshType).map((preset, index) =>
                      <option key={ index } value={ preset }>{ preset }</option>
                    )}
                </select>
            </div>
            <NumberSlider 
                label="Size"
                value={sceneObject.mesh.size} 
                min={0.5} 
                max={15} 
                onSetValue={setSize}
                textConstraint={ textConstraints.sizeConstraint }/>
          
            {sceneObject.mesh.type !== MeshType.ERASER && <ColorSelect
                label="mesh color"
                value={sceneObject.mesh.color}
                onSetValue={setColor}/> }

        </React.Fragment>
      )
}))

export default MeshInspector