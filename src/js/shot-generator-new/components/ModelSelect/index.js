import classNames from 'classnames'
import { remote } from 'electron'
const { dialog } = remote
import LiquidMetal from 'liquidmetal'
import path from 'path'
import { useState, useMemo, forwardRef, useEffect } from 'react'
import { connect } from 'react-redux'
import { FixedSizeGrid } from 'react-window'

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

const filepathFor = model =>
  ModelLoader.getFilepathForModel(
    { model: model.id, type: model.type },
    { storyboarderFilePath: null })

const ModelFileItem = React.memo(({
  style,

  sceneObject,
  model,

  onSelectItem
}) => {
  const src = filepathFor(model).replace(/.glb$/, '.jpg')

  const onSelect = event => {
    event.preventDefault()
    onSelectItem(sceneObject.id, { model: model.id })
  }

  const className = classNames('thumbnail-search__item', {
    'thumbnail-search__item--selected': sceneObject.model === model.id
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

const ListItem = React.memo(({ data, columnIndex, rowIndex, style }) => {
  console.log("rerender")
  const { sceneObject } = data
  const model = data.models[columnIndex + (rowIndex * NUM_COLS)]
  const onSelectItem = data.onSelectItem

  if (!model) return <div/>

  const filepath = (model.id !== 'box') && filepathFor(model)
  const modelData = data.attachments[filepath] && data.attachments[filepath].value

  return <ModelFileItem 
      style={style}
      sceneObject={sceneObject}
      model={model}
      modelData={modelData}
      onSelectItem={onSelectItem}/>
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
    attachments: state.attachments,
    allModels: state.models
  }),
  {
    updateObject,
    withState: (fn) => (dispatch, getState) => fn(dispatch, getState()),
  }
)(
  React.memo(({
    id,

    attachments,
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
    }, [id])

    console.log("Rerender")
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

    const onSelectItem = (id, { model }) => {
      updateObject(id, { model })
    }

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

    // via https://reactjs.org/docs/forwarding-refs.html
    const innerElementType = forwardRef(({ style, ...rest }, ref) => {
      return <div 
          ref={ref}
          style={{
            ...style,
            width: 288, // cut off the right side gutter
            position: 'relative',
            overflow: 'hidden'
          }}
          {...rest}>
      </div>
    })

    const isCustom = sceneObject.model && ModelLoader.isCustomModel(sceneObject.model)

    return sceneObject.model && 
      <div className="thumbnail-search column"> 
        <div className="row" style={{ padding:'6px 0' }}> 
          <div className="column" style={{ flex: 1 } }> 
            <input
              placeholder='Search models …'
              onChange={onSearchChange}> 
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
          <FixedSizeGrid
            columnCount= {NUM_COLS}
            columnWidth={ITEM_WIDTH + GUTTER_SIZE}
            rowCount={Math.ceil(results.length / NUM_COLS)}
            rowHeight={ITEM_HEIGHT}

            width={288}
            height={rows === 2
              ? 248 // built-in Characters list
              : rows * ITEM_HEIGHT} // built-in Models list

            innerElementType={innerElementType}

            itemData={{
              models: results,
              attachments,

              sceneObject,

              onSelectItem
            }}
            children={ListItem}
          />
        </div>
      </div> 
    
  }))

export default ModelSelect
