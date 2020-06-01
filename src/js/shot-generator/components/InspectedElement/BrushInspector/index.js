import {connect} from 'react-redux'
import React, {useMemo} from 'react'
import ColorSelect from '../../ColorSelect'
import {
    getSelections,
    getSceneObjects,
    updateObject,
    updateDrawingMesh
  } from '../../../../shared/reducers/shot-generator'
import {formatters, NumberSlider, transforms, textFormatters, textConstraints} from '../../NumberSlider'
import deepEqualSelector from '../../../../utils/deepEqualSelector'
import MeshType from '../../Three/Helpers/Meshes/TextureMeshTypes'

const BrushInspector = connect((state) => ({
    drawingMesh: state.drawingMesh
}), 
{
    updateDrawingMesh
}
)( 
React.memo(({
    updateDrawingMesh,
    drawingMesh
}) => {

    const setSize = (value) => {
        updateDrawingMesh({ size: value })
    }

    const setColor = (value) => {
        updateDrawingMesh({ color: value })
    }

    const setType = (event) => {
        updateDrawingMesh({ type: event.target.value })
    }

    return (
        <React.Fragment>
            <div className="row" style={{ margin: "9px 0 6px 0", paddingRight: 0 }}> 
                <div style={{ width: 50, display: "flex", alignSelf: "center" }}>Type</div>
                <select required={ true }
                  value={ drawingMesh.type || MeshType.SIMPLE }
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
                value={drawingMesh.size} 
                min={0.5} 
                max={15} 
                onSetValue={setSize}
                textConstraint={ textConstraints.sizeConstraint }/>
          
            {drawingMesh.type !== MeshType.ERASER && <ColorSelect
                label="mesh color"
                value={drawingMesh.color}
                onSetValue={setColor}/> }

        </React.Fragment>
      )
}))

export default BrushInspector