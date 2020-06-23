import {connect} from 'react-redux'
import React, {useMemo, useEffect} from 'react'
import ColorSelect from '../../ColorSelect'
import {
    getSelections,
    getSceneObjects,
    updateObject,
    updateDrawingBrush,
    setCleanImage,
    enableDrawMode
  } from '../../../../shared/reducers/shot-generator'
import {formatters, NumberSlider, transforms, textFormatters, textConstraints} from '../../NumberSlider'
import BrushType from '../../Three/Helpers/Brushes/TextureBrushTypes'
import { ipcRenderer } from 'electron'

const BrushInspector = connect((state) => ({
    drawingBrush: state.drawingBrush,
    selections: getSelections(state)
}), 
{
    updateDrawingBrush,
    enableDrawMode,
    setCleanImage
}
)( 
React.memo(({
    updateDrawingBrush,
    enableDrawMode,
    setCleanImage,
    drawingBrush,
    selections
}) => {


    useEffect(() => {
        enableDrawMode(true)
        return () => {
            enableDrawMode(false)
        }
    }, [])

    const setSize = (value) => {
        updateDrawingBrush({ size: value })
    }

    const setColor = (value) => {
        updateDrawingBrush({ color: value })
    }

    const setType = (event) => {
        updateDrawingBrush({ type: event.target.value })
    }

    const cleanImage = () => {
        setCleanImage([...selections])
    }

    return (
        <React.Fragment>
            <div className="row" style={{ margin: "9px 0 6px 0", paddingRight: 0 }}> 
                <div style={{ width: 50, display: "flex", alignSelf: "center" }}>Type</div>
                <select required={ true }
                  value={ drawingBrush.type || BrushType.SIMPLE }
                  onChange={ setType }
                  style={{ flex: 1,
                        marginBottom: 0,
                        maxWidth: 192 }}>
                    { Object.values(BrushType).map((preset, index) =>
                      <option key={ index } value={ preset }>{ preset }</option>
                    )}
                </select>
            </div>
            <NumberSlider 
                label="Size"
                value={drawingBrush.size} 
                min={0.5} 
                max={15} 
                onSetValue={setSize}
                textConstraint={ textConstraints.sizeConstraint }/>
          
            {drawingBrush.type !== BrushType.ERASER && <ColorSelect
                label="mesh color"
                value={drawingBrush.color}
                onSetValue={setColor}/> }
            <div className="mirror_button__wrapper">
                <div className="mirror_button" onPointerDown={ cleanImage }>Clean Selected Image</div>
            </div>

        </React.Fragment>
      )
}))

export default BrushInspector