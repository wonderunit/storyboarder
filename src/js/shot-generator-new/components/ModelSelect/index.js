import path from 'path'
import React from 'react'
import LiquidMetal from 'liquidmetal'

import { useState, useMemo, useEffect, useCallback } from 'react'
import { connect } from 'react-redux'
import {
  updateObject,
  getSceneObjects,
} from '../../../shared/reducers/shot-generator'
import ModelLoader from '../../../services/model-loader'

import HelpButton from '../HelpButton'
import ListItem from './ListItem'

import SimpleGrid from '../SimpleGrid'
import classNames from 'classnames'
import { truncateMiddle } from '../../../utils'
import { GUTTER_SIZE, ITEM_WIDTH, ITEM_HEIGHT, NUM_COLS } from './ItemSettings'
import FileInput from '../FileInput'

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

    const onSelectFile = filepath => {
      if (filepath.file) {
        updateObject(sceneObject.id, { model: filepath.file })
      }
    }

    const onSelectItem = useCallback((id, { model }) => {
      updateObject(id, { model })
    }, [])

    const selectValue = useCallback(() => {
      const ext = path.extname(sceneObject.model)
      const basenameWithoutExt = path.basename(sceneObject.model, ext)
      const displayName = truncateMiddle(basenameWithoutExt, 13)
      return displayName
    }, [sceneObject.model])

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
    const refClassName = classNames( "button__file", {
      "button__file--selected": isCustom
    })
    const wrapperClassName = "button__file__wrapper"
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
            : <div className="column" style={{ alignSelf: "center", padding: 6, lineHeight: 1 }}>or</div>
          }
          <FileInput value={ isCustom ? selectValue() : "Select File …" } 
                     title={ isCustom ? path.basename(sceneObject.model) : undefined } 
                     onChange={ onSelectFile } 
                     refClassName={ refClassName }
                     wrapperClassName={ wrapperClassName }/>
            <div className="column" style= {{ width: 20, margin: "0 0 0 6px", alignSelf: "center", alignItems: "flex-end" } }>
              <HelpButton
                url="https://github.com/wonderunit/storyboarder/wiki/Creating-custom-3D-Models-for-Shot-Generator"
                title="How to Create 3D Models for Custom Objects"/>
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
              onSelectItem={ onSelectItem }/>
        </div>
      </div> 
  }
))
export default ModelSelect
