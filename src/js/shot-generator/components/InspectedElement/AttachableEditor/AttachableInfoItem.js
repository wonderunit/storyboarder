import React, {useMemo} from 'react'
import { useTranslation } from 'react-i18next'
const AttachableInfoItem = React.memo(({
    sceneObject,
    onSelectItem,
    onDelete,
    getNumberSlider
  
}) => {
    const { t } = useTranslation()
    const bindBoneName = !sceneObject ? '' : sceneObject.bindBone ? sceneObject.bindBone : ''
    const onHandSelect = () => {
        onSelectItem(sceneObject.id, sceneObject.bindBone )
    }
    const buttonName = useMemo(() => bindBoneName, [bindBoneName])
    const attachableName = useMemo(() => { 
        return !sceneObject.displayName ? '' : sceneObject.displayName
    })

    return <div className="attachable-card">
        <div className="attachable-card___title">
            <div className="attachable-card___label">{ attachableName }</div>
            <a className="attachable-card__discard" 
                href="#" 
                onClick={ () => { onDelete(sceneObject)} }>X</a>
        </div> 
        <div className="number-slider">
            <div className="number-slider__label">{t("shot-generator.inspector.attachables-inspector.attached-to-bone")}</div> 
            <div className="column" style={{ marginLeft: 5 }}>
              <a className="button_add" 
                href="#" 
                style={{ width: 161, height: 35 }}
                onPointerUp={ onHandSelect }>{ buttonName }</a> 
            </div>
        </div> 
        { getNumberSlider(sceneObject) }
    </div>
})
export default AttachableInfoItem
