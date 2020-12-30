import path from 'path'
import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react'
import { connect } from 'react-redux'

import {
  createObject,
  selectAttachable,
  getSceneObjects,
  getSelections,
  undoGroupStart,
  undoGroupEnd
} from '../../../../shared/reducers/shot-generator'
import FileInput from '../../FileInput'
import classNames from 'classnames'
import HelpButton from '../../HelpButton'

import * as itemSettings from '../../../utils/InspectorElementsSettings'
import HandSelectionModal from '../HandInspector/HandSelectionModal'
import SearchList from '../../SearchList'
import ModelInspectorItem from '../ModelInspectorItem'
import Grid from '../../Grid'
import Scrollable from '../../Scrollable'

import AttachableEditor from './../AttachableEditor/index'
import isUserModel from '../../../helpers/isUserModel'
import CopyFile from '../../../utils/CopyFile'
import { useTranslation } from 'react-i18next'
const AttachableInspector = connect(
  state => ({
    id: getSelections(state)[0]
  }),
  {
    createObject,
    selectAttachable,
    withState: (fn) => (dispatch, getState) => fn(dispatch, getState()),
    undoGroupStart,
    undoGroupEnd
  }
)(
  React.memo(({
    id,
    withState,
    createObject,
    selectAttachable,
    undoGroupStart,
    undoGroupEnd
  }) => {
    const { t } = useTranslation()
    const [isModalVisible, showModal] = useState(false)
    const [results, setResults] = useState([])
    const [sceneObject, setSceneObject] = useState({})
    const selectedId = useRef(null)
    const selectedModel = useRef(null)
    const sortedAttachables = useRef([])
    const models = useMemo(() => {
      let attachableModels = null
      withState((dispatch, state) => {
        let allModels = state.models
        attachableModels = Object.values(allModels).filter(m => m.type === "attachable" && m.attachableType !== 'hair')
      })
      setResults(attachableModels)
      sortedAttachables.current = attachableModels.map((attachable, index) => {
        return { value: [attachable.name, attachable.keywords].filter(Boolean).join(' '), id: index
        }})
      return attachableModels
    }, [sceneObject.type])

    useEffect(() => {
      withState((dispatch, state) => {
        setSceneObject(getSceneObjects(state)[id])
      })
    }, [id])

    const onSelectItem = useCallback((model) => {
      selectedModel.current = model
      selectedId.current = model.id || id
      if(model.bindBone && !isUserModel(sceneObject.model)) {
        createAttachableElement(model, id)
        return
      }

      showModal(true)
    }, [id, sceneObject])

    const createAttachableElement = (model, id, name = null ) => {
      let modelData = model
      if(!(modelData instanceof Object)) {
        modelData = {
          id: model,
          name: model,
          x:0,
          y:0,
          z:0,
          rotation: {   
            x:0,
            y:0,
            z:0
          }
        }
      } 
      if(name && modelData.bindBone) {
        modelData.x = 0
        modelData.y = 0
        modelData.z = 0
        modelData.rotation = { x:0, y:0, z:0 }
      }

      let key = THREE.Math.generateUUID()
      let element = {
        id: key,
        type: 'attachable',
        x: modelData.x,
        y: modelData.y,
        z: modelData.z,

        model: modelData.id,
        name: modelData.name,
        bindBone: name || modelData.bindBone,
        attachToId: id,
        size: 1,
        status: "PENDING",
        rotation: modelData.rotation
      }
      undoGroupStart()
      createObject(element)
      selectAttachable({id: element.id, bindId: element.attachToId })
      undoGroupEnd()
    }

    const onSelectFile = useCallback((filepath) => {
      if (filepath.file) {
        let storyboarderFilePath
        withState((dispatch, state) => {
          storyboarderFilePath = state.meta.storyboarderFilePath
        })
        let updatedModel = CopyFile(storyboarderFilePath, filepath.file, 'attachable')
        onSelectItem(updatedModel)
      }
    }, [id, onSelectItem])

    const saveFilteredPresets = useCallback((filteredPreset) => {
      let presets = []
      for(let i = 0; i < filteredPreset.length; i++) {
        presets.push(models[filteredPreset[i].id])
      }
      setResults(presets)
    }, [models])

    const isCustom = false
    const refClassName = classNames( "button__file", {
      "button__file--selected": isCustom
    })
    const wrapperClassName = "button__file__wrapper"
    return (
      <React.Fragment>
        <HandSelectionModal
          visible={ isModalVisible }
          model={ selectedModel.current }
          setVisible={ showModal }
          id={ id }
          skeleton={ sceneObject.skeleton }
          onSuccess={ createAttachableElement }/>
        <div className="thumbnail-search column">
          <div className="row" style={{ padding: "6px 0" }}>
            <SearchList label={t("shot-generator.inspector.common.search-models")} list={ sortedAttachables.current } onSearch={ saveFilteredPresets }/>
            { isCustom ? <div className="column" style={{ padding: 2 }} />
              : <div className="column" style={{ alignSelf: "center", padding: 6, lineHeight: 1 } }>{t("shot-generator.inspector.common.or")}</div>
            }
            <FileInput value={ isCustom ? selectValue() : t("shot-generator.inspector.common.select-file") }
                       title={ isCustom ? path.basename(sceneObject.model) : undefined }
                       onChange={ onSelectFile }
                       refClassName={ refClassName }
                       wrapperClassName={ wrapperClassName }/>
            <div className="column" style={{ width: 20, margin: "0 0 0 6px", alignSelf: "center", alignItems: "flex-end" }}>
              <HelpButton
                url="https://github.com/wonderunit/storyboarder/wiki/Creating-custom-3D-Models-for-Shot-Generator"
                title={t("shot-generator.inspector.common.object-creation-help")}/>
            </div>
          </div>
          <Scrollable>
            <Grid
              itemData={{
                id: sceneObject.id,
                models: results,
                itemSettings,
                onSelectItem,

                //selectedFunc: (item) => sceneObject.model === item.id
              }}
              Component={ModelInspectorItem}
              elements={results}
              numCols={itemSettings.NUM_COLS}
              itemHeight={itemSettings.ITEM_HEIGHT}
            />

            <AttachableEditor t={t}/>
          </Scrollable>
        </div>
      </React.Fragment>
    )
  }))

export default AttachableInspector
