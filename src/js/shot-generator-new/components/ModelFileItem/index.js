import classNames from 'classnames'
import { filepathFor } from '../../utils/filepathFor'

const ModelFileItem = React.memo(({
    style,
    id,
    isSelected,
    model,
    onSelectItem,
    itemSettings
  }) => {
    const src = filepathFor(model).replace(/.glb$/, '.jpg')
  
    const onSelect = event => {
      event.preventDefault()
      onSelectItem(id, { model: model })
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
        <figure style={{ width: itemSettings.IMAGE_WIDTH, height: itemSettings.IMAGE_HEIGHT }}> 
          <img src={ src } style={{ width: itemSettings.IMAGE_WIDTH, height: itemSettings.IMAGE_HEIGHT }}/>
        </figure>
        <div className="thumbnail-search__name" 
          style={{
            width: itemSettings.ITEM_WIDTH + slop,
            height: (itemSettings.ITEM_HEIGHT - itemSettings.IMAGE_HEIGHT - itemSettings.GUTTER_SIZE) + slop
          }}>
        { model.name }
        </div>
      </div>
})
export default ModelFileItem