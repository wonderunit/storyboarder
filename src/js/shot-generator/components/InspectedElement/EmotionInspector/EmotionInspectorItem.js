import React, { useMemo } from 'react'
import { GUTTER_SIZE, ITEM_WIDTH, ITEM_HEIGHT, IMAGE_HEIGHT, IMAGE_WIDTH } from '../../../utils/InspectorElementsSettings'
import Image from '../../Image'
import classNames from 'classnames'
import path from 'path'
const EmotionInspectorItem = React.memo(({ id, style, onSelectItem, data, storyboarderPath }) => {
    const src = path.join(window.__dirname, 'data', 'shot-generator', 'emotions', `${data.filename}.png`)

    let className = classNames("thumbnail-search__item", {
       // "thumbnail-search__item--selected": posePresetId === preset.id
    })
    const onPointerDown = () => {
        onSelectItem(data.filename)
    }
    return <div className={ className }
        style={ style }
        onPointerUp={ onPointerDown }
        title={ data.name }>
            <div style={{ width: IMAGE_WIDTH, height: IMAGE_HEIGHT }}>
                <Image src={ src } className="thumbnail"/>
            </div>
            <div className="thumbnail-search__name"
              style={{
                width: ITEM_WIDTH ,
                height: ITEM_HEIGHT - IMAGE_HEIGHT - GUTTER_SIZE
              }}>
            { data.name }
            </div>
        </div>
})

export default EmotionInspectorItem;