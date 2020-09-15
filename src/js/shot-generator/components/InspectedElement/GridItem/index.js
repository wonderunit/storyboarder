import React from 'react'
import classNames from 'classnames'
import {
  ITEM_WIDTH,
  ITEM_HEIGHT,
  IMAGE_HEIGHT,
  IMAGE_WIDTH,
  GUTTER_SIZE
} from '../../../utils/InspectorElementsSettings'
import Image from '../../Image'

const GridItem = React.memo(
  ({
    style,
    data,
    ...itemData
  }) => {
    const { title, src, isSelected } = data

    const onPointerUp = event => itemData.onSelect(data)

    const className = classNames('thumbnail-search__item', {
      'thumbnail-search__item--selected': isSelected
    })

    // allow a little text overlap
    const slop = GUTTER_SIZE

    return (
      <div
        className={className}
        onPointerUp={onPointerUp}
        title={title}
      >
        <div style={{ width: IMAGE_WIDTH, height: IMAGE_HEIGHT }}>
          { src && <Image src={src} className="thumbnail" /> }
        </div>
        <div
          className="thumbnail-search__name"
          style={{
            width: ITEM_WIDTH + slop,
            height: ITEM_HEIGHT - IMAGE_HEIGHT - GUTTER_SIZE + slop
          }}
        >
          {title}
        </div>
      </div>
    )
  }
)
export default GridItem
