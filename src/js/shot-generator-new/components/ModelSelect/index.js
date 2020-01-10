import path from 'path'
import React from 'react'

import { useState, useMemo, useEffect, useCallback, useRef } from 'react'
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
import { GUTTER_SIZE, ITEM_WIDTH, ITEM_HEIGHT, NUM_COLS } from '../../utils/InspectorElementsSettings'
import FileInput from '../FileInput'
import SearchList from '../SearchList'

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
    const [sceneObject, setSceneObject] = useState({})
    const sortedModels = useRef([])
    const [results, setResults] = useState([])
    const models = useMemo(() => { 
      let models = Object.values(allModels).filter(m => m.type === sceneObject.type)
      sortedModels.current = models.map((model, index) => { return {
        value: [model.name, model.keywords].filter(Boolean).join(' '),
        id: index
      }})
      setResults(models)
      return models
    }, [allModels, sceneObject.type])

    useEffect(() => {
      withState((dispatch, state) => {
        setSceneObject(getSceneObjects(state)[id])
      })
    }, [id, model])

    const saveFilteredPresets = useCallback((filteredModels) => {
      let foundModels = []
      for(let i = 0; i < filteredModels.length; i++) {
        foundModels.push(models[filteredModels[i].id])
      }
      setResults(foundModels)
    }, [models])

    const onSelectFile = filepath => {
      if (filepath.file) {
        updateObject(sceneObject.id, { model: filepath.file })
      }
    }

    const onSelectItem = useCallback((id, { model }) => {
      updateObject(id, { model:model.id })
    }, [])

    const selectValue = useCallback(() => {
      const ext = path.extname(sceneObject.model)
      const basenameWithoutExt = path.basename(sceneObject.model, ext)
      const displayName = truncateMiddle(basenameWithoutExt, 13)
      return displayName
    }, [sceneObject.model])

    const isCustom = sceneObject.model && ModelLoader.isCustomModel(sceneObject.model)
    const refClassName = classNames( "button__file", {
      "button__file--selected": isCustom
    })
    const wrapperClassName = "button__file__wrapper"
    return sceneObject.model && 
      <div className="thumbnail-search column"> 
        <div className="row" style={{ padding: "6px 0" }}> 
          <SearchList label="Search models …" list={ sortedModels.current } onSearch={ saveFilteredPresets }/>
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
