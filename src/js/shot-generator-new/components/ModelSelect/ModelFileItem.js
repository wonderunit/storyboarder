import { IMAGE_WIDTH, IMAGE_HEIGHT, GUTTER_SIZE, ITEM_WIDTH, ITEM_HEIGHT } from './ItemSettings'
import classNames from 'classnames'
import ModelLoader from '../../../services/model-loader'

const filepathFor = model =>
  ModelLoader.getFilepathForModel(
    { model: model.id, type: model.type },
    { storyboarderFilePath: null })

const ModelFileItem = React.memo(({
    style,
    id,
    isSelected,
    model,
    onSelectItem
  }) => {
    const src = filepathFor(model).replace(/.glb$/, '.jpg')
  
    const onSelect = event => {
      event.preventDefault()
      onSelectItem(id, { model: model.id })
    }
    const className = classNames('thumbnail-search__item', {
      'thumbnail-search__item--selected': isSelected
    })
    // allow a little text overlap
    const slop = GUTTER_SIZE
  
    return <div className={ className }
      style={ style }
      onPointerUp={ onSelect }
      data-id={ model.id }
      title={ model.name }> 
        <figure style={{ width: IMAGE_WIDTH, height: IMAGE_HEIGHT }}> 
          <img src={ src } style={{ width: IMAGE_WIDTH, height: IMAGE_HEIGHT } }/>
        </figure>
        <div className="thumbnail-search__name" 
          style={{
            width: ITEM_WIDTH + slop,
            height: (ITEM_HEIGHT - IMAGE_HEIGHT - GUTTER_SIZE) + slop
          }}>
        { model.name }
        </div>
      </div>
})
export default ModelFileItem