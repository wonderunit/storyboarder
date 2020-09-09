import path from 'path'
import React from 'react'

import { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import { connect, batch } from 'react-redux'
import {
  updateObject,
  getSceneObjects, 
  getSelections,
  getDefaultPosePreset,
  updateCharacterIkSkeleton,
  undoGroupStart,
  undoGroupEnd,
} from '../../../../shared/reducers/shot-generator'
import ModelLoader from '../../../../services/model-loader'

import HelpButton from '../../HelpButton'
import ModelInspectorItem from './../ModelInspectorItem'
import Scrollable from '../../Scrollable'
import Grid from '../../Grid'
import classNames from 'classnames'
import { truncateMiddle } from '../../../../utils'
import * as itemSettings from '../../../utils/InspectorElementsSettings'
import FileInput from '../../FileInput'
import SearchList from '../../SearchList'
import deepEqualSelector from '../../../../utils/deepEqualSelector'
import isUserModel from '../../../helpers/isUserModel'
import CopyFile from '../../../utils/CopyFile'
import { useTranslation } from 'react-i18next'
const getModelData = deepEqualSelector([(state) => {
  const selectedId = getSelections(state)[0]
  const object = getSceneObjects(state)[selectedId]

  return {
    allModels: state.models,
    id: selectedId,
    model: object.model,
    sceneObject: object
  }
}], data => data)

const ModelInspector = connect(
  getModelData,
  {
    updateObject,
    updateCharacterIkSkeleton,
    undoGroupStart,
    undoGroupEnd,
    withState: (fn) => (dispatch, getState) => fn(dispatch, getState()),
  }
)(
  React.memo(({
    id,
    model,
    allModels,
    sceneObject,

    updateObject,
    updateCharacterIkSkeleton,
    undoGroupStart,
    undoGroupEnd,
    
    withState
  }) => {
      const { t } = useTranslation()
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

      const saveFilteredPresets = useCallback((filteredModels) => {
        let foundModels = []
        for(let i = 0; i < filteredModels.length; i++) {
          foundModels.push(models[filteredModels[i].id])
        }
        setResults(foundModels)
      }, [models])

      const prevModel = useRef(null)
      useEffect(() => {
        prevModel.current = sceneObject.model
      }, [sceneObject.model])

      const resetSkeleton = (currentModel) => {
        if(prevModel.current) {
          let isPrevModelUser = isUserModel(prevModel.current)
          let isCurrentModelUser = isUserModel(currentModel)
          withState((dispatch, state) => 
          {
            undoGroupStart()
            updateObject(sceneObject.id, { model: currentModel })
            if(isPrevModelUser && !isCurrentModelUser) {
              let defaultSkeleton = getDefaultPosePreset().state.skeleton
              let skeleton = Object.keys(defaultSkeleton).map((key) => {
                return {
                  name:key,
                  rotation: defaultSkeleton[key].rotation
                }
              })
  
              updateCharacterIkSkeleton({id:sceneObject.id, skeleton:[]})
              updateCharacterIkSkeleton({id:sceneObject.id, skeleton:skeleton})
            } else if(!isPrevModelUser && isCurrentModelUser) {
              // We need to override skeleton when model is changed because in store skeleton position is still has values for prevModel
              updateCharacterIkSkeleton({id:sceneObject.id, skeleton:[]})
           
            } else if(isPrevModelUser && isCurrentModelUser){
              updateCharacterIkSkeleton({id:sceneObject.id, skeleton:[]})
            } 
            setTimeout(() => {
              undoGroupEnd()
            }, 100)
          })
        } 
        prevModel.current = currentModel
      }
  
      const onSelectFile = filepath => {
        if (filepath.file) {
          let storyboarderFilePath
          withState((dispatch, state) => {
            storyboarderFilePath = state.meta.storyboarderFilePath
          })
          let updatedModel = CopyFile(storyboarderFilePath, filepath.file, sceneObject.type)
          if(sceneObject.type === "character") {
            resetSkeleton(updatedModel)
          } else {
            updateObject(sceneObject.id, { model: updatedModel })
          }
        }
      }
      
      const isSelected = useCallback((item) => model === item.id, [model])

      const onSelectItem = useCallback((model) => {
        if(sceneObject.type === "character") {
          resetSkeleton(model.id)
        } else {
          updateObject(sceneObject.id, { model: model.id })
        }
      }, [sceneObject.id])

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
            <SearchList label={t("shot-generator.inspector.common.search-models")} list={ sortedModels.current } onSearch={ saveFilteredPresets }/>
            {isCustom ? <div className="column" style={{ padding: 2 }} />
              : <div className="column" style={{ alignSelf: "center", padding: 6, lineHeight: 1 }}>{t("shot-generator.inspector.common.or")}</div>
            }
            <FileInput value={ isCustom ? selectValue() : t("shot-generator.inspector.common.select-file") }
                       title={ isCustom ? path.basename(sceneObject.model) : undefined }
                       onChange={ onSelectFile }
                       refClassName={ refClassName }
                       wrapperClassName={ wrapperClassName }/>
            <div className="column" style= {{ width: 20, margin: "0 0 0 6px", alignSelf: "center", alignItems: "flex-end" } }>
              <HelpButton
                url="https://github.com/wonderunit/storyboarder/wiki/Creating-custom-3D-Models-for-Shot-Generator"
                title={t("shot-generator.inspector.common.object-creation-help")}/>
            </div>
          </div>
          <div className="thumbnail-search__list">
            <Scrollable>
              <Grid
                itemData={{
                  id: sceneObject.id,
                  itemSettings,
                  onSelectItem,

                  selectedFunc: isSelected
                }}
                Component={ModelInspectorItem}
                elements={results}
                numCols={itemSettings.NUM_COLS}
                itemHeight={itemSettings.ITEM_HEIGHT}
              />
            </Scrollable>
          </div>
        </div>
    }
  ))
export default ModelInspector
