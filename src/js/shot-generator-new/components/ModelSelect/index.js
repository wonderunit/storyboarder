import classNames from 'classnames'
import { remote } from 'electron'
const { dialog } = remote
import LiquidMetal from 'liquidmetal'
import path from 'path'
import { useState, useMemo, useEffect, useCallback } from 'react'
import { connect } from 'react-redux'

import {
  updateObject,
  getSceneObjects,
} from '../../../shared/reducers/shot-generator'
import ModelLoader from '../../../services/model-loader'
import { truncateMiddle } from '../../../utils'

import CustomModelHelpButton from '../../CustomModelHelpButton'

const GUTTER_SIZE = 5
const ITEM_WIDTH = 68
const ITEM_HEIGHT = 132

const IMAGE_WIDTH = ITEM_WIDTH
const IMAGE_HEIGHT = 100

const NUM_COLS = 4
const elementStyle = {
  position:"absolute", 
  height:ITEM_HEIGHT, 
  width:ITEM_WIDTH + GUTTER_SIZE}

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

const ListItem = React.memo(({ id, isSelected, model, style, index, onSelectItem}) => {
  if (!model) return <div/>
  let currentRow = index / NUM_COLS 
  let currentCol = index % (NUM_COLS)
  let newElementStyle = {position: style.position, width: style.width, height: style.height}
  newElementStyle.top = style.height * Math.floor(currentRow)
  newElementStyle.left = style.width * currentCol

  return model && <ModelFileItem 
      style={ newElementStyle } 
      id={ id }
      isSelected={ isSelected }
      model={ model }
      onSelectItem={ onSelectItem }/>
})

const FileSelect = ({ model, onSelectFile }) => {
  const isCustom = ModelLoader.isCustomModel(model)
  const ext = path.extname(model)
  const basenameWithoutExt = path.basename(model, ext)
  const displayName = truncateMiddle(basenameWithoutExt, 13)

  const className = classNames({
    'button__file--selected': isCustom,
    'button__file': !isCustom
  })

  return <div className="column" style={{ width: 106 } }> 
      <a className={className} href='#' 
          style={{ flex: 1, width: '100%', height: 34, whiteSpace: 'nowrap', overflow: 'hidden' }}
          onPointerUp={ onSelectFile }
          title={ isCustom ? path.basename(model) : undefined }>
        {isCustom
          ? displayName
          : 'Select File …'}
      </a>
    </div>
}


const ModelSelect = connect(
  state => ({
    allModels: state.models
  }),
  {
    updateObject,
    withState: (fn) => (dispatch, getState) => fn(dispatch, getState()),
  }
)(
  React.memo(({
    id,
    model,
    allModels,

    updateObject,
    transition,
    withState,

    rows = 3
  }) => {
    const [terms, setTerms] = useState(null)
    const [sceneObject, setSceneObject] = useState({})
    const models = useMemo(
      () => Object.values(allModels).filter(m => m.type === sceneObject.type),
      [allModels, sceneObject.type]
    )

    useEffect(() => {
      withState((dispatch, state) => {
        setSceneObject(getSceneObjects(state)[id])
      })
    }, [id, model])

    const onSearchChange = event => {
      event.preventDefault()
      setTerms(event.currentTarget.value)
    }

    const onSelectFile = event => {
      event.preventDefault()

      const filepaths = dialog.showOpenDialog(null, {})

      if (filepaths) {
        const filepath = filepaths[0]
        updateObject(sceneObject.id, { model: filepath })
      }

      // automatically blur to return keyboard control
      document.activeElement.blur()
      transition('TYPING_EXIT')
    }

    const onSelectItem = useCallback((id, { model }) => {
      updateObject(id, { model })
    }, [])

    const results = useMemo(() => {
      const matchAll = terms == null || terms.length === 0

      return models
        .filter(model =>
          matchAll
            ? true
            : LiquidMetal.score(
              [model.name, model.keywords].filter(Boolean).join(' '),
              terms
            ) > 0.8
        )
    }, [terms, sceneObject.id])

    const isCustom = sceneObject.model && ModelLoader.isCustomModel(sceneObject.model)
    return sceneObject.model && 
      <div className="thumbnail-search column"> 
        <div className="row" style={{ padding:'6px 0' }}> 
          <div className="column" style={{ flex: 1 } }> 
            <input
              placeholder='Search models …'
              onChange={ onSearchChange }> 
            </input>
          </div>
          {isCustom ? <div className="column" style={{ padding: 2 }} />
            : <div className="column" style={{ alignSelf: 'center', padding: 6, lineHeight: 1 } }>or</div>
            }
          <FileSelect model={sceneObject.model} onSelectFile={onSelectFile} />
            <div className="column" style= {{ width: 20, margin: '0 0 0 6px', alignSelf: 'center', alignItems: 'flex-end' } }>
              <CustomModelHelpButton/>
            </div>
        </div>
        <div className="thumbnail-search__list">
          <div className="row" style={{
                   width: 288, 
                   height: rows === 2 ? 248 : rows * ITEM_HEIGHT,
                   position: "relative",
                   overflow: "auto"}}>
            { results.map((item, index) => <ListItem 
                      key={ index }
                      model={ item } 
                      style={ elementStyle }
                      id={ sceneObject.id }
                      isSelected={ sceneObject.model === item.id }
                      onSelectItem={ onSelectItem }
                      index={ index }
                      />)}
          </div>
        </div>
      </div> 
    
  }))

export default ModelSelect
