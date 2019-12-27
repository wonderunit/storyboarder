import { remote } from 'electron'
const { dialog } = remote
import LiquidMetal from 'liquidmetal'

import { useState, useMemo, useEffect, useCallback } from 'react'
import { connect } from 'react-redux'
import {
  updateObject,
  getSceneObjects,
} from '../../../shared/reducers/shot-generator'
import ModelLoader from '../../../services/model-loader'

import CustomModelHelpButton from '../../CustomModelHelpButton'
import FileSelect from '../FileSelect'
import ListItem from './ListItem'

import SimpleGrid from '../SimpleGrid'

import { GUTTER_SIZE, ITEM_WIDTH, ITEM_HEIGHT, NUM_COLS } from './ItemSettings'

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
        <div className="row" style={{ padding: "6px 0" }}> 
          <div className="column" style={{ flex: 1 } }> 
            <input
              placeholder="Search models …"
              onChange={ onSearchChange }> 
            </input>
          </div>
          {isCustom ? <div className="column" style={{ padding: 2 }} />
            : <div className="column" style={{ alignSelf: "center", padding: 6, lineHeight: 1 } }>or</div>
            }
          <FileSelect model={ sceneObject.model } onSelectFile={ onSelectFile } />
            <div className="column" style= {{ width: 20, margin: "0 0 0 6px", alignSelf: "center", alignItems: "flex-end" } }>
              <CustomModelHelpButton/>
            </div>
        </div>
        <div className="thumbnail-search__list">
          <SimpleGrid 
            style={{
              width: 288, 
              height: rows === 2 ? 248 : rows * ITEM_HEIGHT,
              position: "relative",
              overflow: "auto"}}
              Tag={ ListItem }
              elements={ results }
              numCols={ NUM_COLS }
              itemHeight={ ITEM_HEIGHT }
              itemWidth={ ITEM_WIDTH + GUTTER_SIZE }
              selectedFunc={ (item) => sceneObject.model === item.id }
              id={ sceneObject.id }
              onSelectItem={ onSelectItem }
          />
        </div>
      </div> 
    
  }))
export default ModelSelect
