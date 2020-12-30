import React, { useState, useEffect } from 'react'
import classNames from 'classnames'
import { filepathFor } from '../../../utils/filepathFor'
import {IMAGE_HEIGHT, IMAGE_WIDTH} from '../../../utils/InspectorElementsSettings'
import Image from '../../Image'

const ModelInspectorItem = React.memo(({
    style,
    id,
    selectedFunc = () => false,
    data : model,
    onSelectItem,
    itemSettings,
    selectInitial = false
  }) => {
    const src = filepathFor(model).replace(/.glb$/, '.jpg')
    const [isSelected, setSelected] = useState()
    useEffect(() => {
      if(selectInitial && selectedFunc(model)) {
        onSelect()
      }
    }, [])
    const onSelect = () => {
      onSelectItem(model, () => setSelected(false))
      setSelected(true)
    }

    const className = classNames("thumbnail-search__item", {
      "thumbnail-search__item--selected": isSelected
    })
    // allow a little text overlap
    const slop = itemSettings.GUTTER_SIZE

    return <div className={ className }
      style={ style }
      onPointerUp={ onSelect }
      data-id={ model.id }
      title={ model.name }>
        <div style={{ width: IMAGE_WIDTH, height: IMAGE_HEIGHT }}>
          <Image src={ src } className="thumbnail"/>
        </div>
        <div className="thumbnail-search__name"
          style={{
            width: itemSettings.ITEM_WIDTH + slop,
            height: (itemSettings.ITEM_HEIGHT - itemSettings.IMAGE_HEIGHT - itemSettings.GUTTER_SIZE) + slop
          }}>
        { model.name }
        </div>
      </div>
})
export default ModelInspectorItem
