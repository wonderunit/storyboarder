import {connect} from 'react-redux'
import React, {useEffect} from 'react'
import ColorSelect from '../../ColorSelect'
import {
    getSelections,
    updateDrawMode,
    getDrawMode
  } from '../../../../shared/reducers/shot-generator'
import {NumberSlider, textConstraints} from '../../NumberSlider'
import BrushType from '../../Three/Helpers/Brushes/TextureBrushTypes'
import { useTranslation } from 'react-i18next'

const BrushInspector = connect((state) => ({
    drawMode: getDrawMode(state),
    selections: getSelections(state)
}), 
{
    updateDrawMode
}
)( 
React.memo(({
    updateDrawMode,
    drawMode,
    selections
}) => {
    const { t } = useTranslation()

    useEffect(() => {
        updateDrawMode({isEnabled: true})
        return () => {
            updateDrawMode({isEnabled: false})
        }
    }, [])

    const setSize = (value) => {
        updateDrawMode({ brush: { size: value }})
    }

    const setColor = (value) => {
        updateDrawMode({ brush: { color: value }})
    }

    const setType = (event) => {
        updateDrawMode({ brush: { type: event.target.value }})
    }

    const cleanImage = () => {
        updateDrawMode({ cleanImages: [...selections]})
    }

    return (
        <React.Fragment>
            <div className="row" style={{ margin: "9px 0 6px 0", paddingRight: 0 }}> 
                <div style={{ width: 50, display: "flex", alignSelf: "center" }}>{t("shot-generator.inspector.inspected-element.type")}</div>
                <select required={ true }
                  value={ drawMode.brush.type }
                  onChange={ setType }
                  style={{ flex: 1,
                        marginBottom: 0,
                        maxWidth: 192 }}>
                    { Object.values(BrushType).map((preset, index) =>
                      <option key={ index } value={ preset }>{ t(`shot-generator.inspector.inspected-element.${preset.toLowerCase()}`)}</option>
                    )}
                </select>
            </div>
            <NumberSlider 
                label={t("shot-generator.inspector.common.size")}
                value={ drawMode.brush.size} 
                min={0.5} 
                max={15} 
                onSetValue={setSize}
                textConstraint={ textConstraints.sizeConstraint }/>
          
            {drawMode.brush.type !== BrushType.ERASER && <ColorSelect
                label={t("shot-generator.inspector.inspected-element.brush-color")}
                value={ drawMode.brush.color}
                onSetValue={setColor}/> }
           { selections.length > 0 && <div className="mirror_button__wrapper">
                <div className="mirror_button" onPointerDown={ cleanImage }>Clear Selected Image</div>
            </div>}

        </React.Fragment>
      )
}))

export default BrushInspector