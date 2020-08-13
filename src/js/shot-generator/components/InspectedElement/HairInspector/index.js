import path from 'path'
import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react'
import { connect } from 'react-redux'

import {
  createObject,
  selectAttachable,
  getSceneObjects,
  getSelections,
  deleteObjects
} from '../../../../shared/reducers/shot-generator'
import FileInput from '../../FileInput'
import classNames from 'classnames'
import HelpButton from '../../HelpButton'

import * as itemSettings from '../../../utils/InspectorElementsSettings'
import SearchList from '../../SearchList'
import ModelInspectorItem from '../ModelInspectorItem'
import Grid from '../../Grid'
import Scrollable from '../../Scrollable'
import HandSelectionModal from '../HandInspector/HandSelectionModal'

import isUserModel from '../../../helpers/isUserModel'
import CopyFile from '../../../utils/CopyFile'

const HairInspector = connect(
  state => ({
    id: getSelections(state)[0]
  }),
  {
    createObject,
    selectAttachable,
    deleteObjects,
    withState: (fn) => (dispatch, getState) => fn(dispatch, getState())
  }
)(
  React.memo(({
    id,
    withState,
    createObject,
    selectAttachable,
    deleteObjects
  }) => {

    const [isModalVisible, showModal] = useState(false)
    const [results, setResults] = useState([])
    const [sceneObject, setSceneObject] = useState({})
    const sortedAttachables = useRef([])
    const deselectElement = useRef(null)
    const getSelectedHair = () => {
        let sceneObjects 
        withState((dispatch, state) => {
            sceneObjects = getSceneObjects(state)
        })
        let object = Object.values(sceneObjects).find((item) => item.type === "attachable" && item.attachableType === "hair" && item.attachToId === id)
        return object
    }

    const createEmptyElement = () => {
        return {id:"", name:"blank", type:"attachable"}
    }

    const findModelFromObject = (object) => {
        if(!object) return createEmptyElement()
        let model 
        withState((dispatch, state) => {
            let allModels = state.models
            model = Object.values(allModels).find((item) => item.id === object.model)
        })
        return model
    }

    const selectedModel = useRef(findModelFromObject(getSelectedHair()))

    const models = useMemo(() => {
      let attachableModels = null
      withState((dispatch, state) => {
        let allModels = state.models
        attachableModels = Object.values(allModels).filter(m => m.type === "attachable" && m.attachableType === "hair")
      })

      sortedAttachables.current = attachableModels.map((attachable, index) => {
        return { value: [attachable.name, attachable.keywords].filter(Boolean).join(' '), id: index
        }})
        attachableModels.unshift(createEmptyElement())
        setResults(attachableModels)
      return attachableModels
    }, [sceneObject.type])

    useEffect(() => {
      withState((dispatch, state) => {
        setSceneObject(getSceneObjects(state)[id])
      })
    }, [id])

    const removeSelectedHairModel = () => {
        let object = getSelectedHair()
        if(object) {
            deleteObjects([object.id])
        }
    }

    const onSelectItem = (model, deselect) => {
        if(deselectElement.current) deselectElement.current()
        deselectElement.current = deselect
        if(selectedModel.current.id === model.id) return
        selectedModel.current = model

        removeSelectedHairModel()
        if(model.name === "blank") return
        if(!isUserModel(sceneObject.model)) { 
            createAttachableElement(model, id)
        } else {
            showModal(true)
        }
    }

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
        attachableType:"hair",
        model: modelData.id,
        name: modelData.name,
        bindBone: name || modelData.bindBone,
        attachToId: id,
        size: 1,
        status: "PENDING",
        rotation: modelData.rotation
      }
      createObject(element)
      selectAttachable({id: element.id, bindId: element.attachToId })
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
      presets.unshift(createEmptyElement())
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
            <SearchList label="Search models …" list={ sortedAttachables.current } onSearch={ saveFilteredPresets }/>
            { isCustom ? <div className="column" style={{ padding: 2 }} />
              : <div className="column" style={{ alignSelf: "center", padding: 6, lineHeight: 1 } }>or</div>
            }
            <FileInput value={ isCustom ? selectValue() : "Select File …" }
                       title={ isCustom ? path.basename(sceneObject.model) : undefined }
                       onChange={ onSelectFile }
                       refClassName={ refClassName }
                       wrapperClassName={ wrapperClassName }/>
            <div className="column" style={{ width: 20, margin: "0 0 0 6px", alignSelf: "center", alignItems: "flex-end" }}>
              <HelpButton
                url="https://github.com/wonderunit/storyboarder/wiki/Creating-custom-3D-Models-for-Shot-Generator"
                title="How to Create 3D Models for Custom Objects"/>
            </div>
          </div>
          <Scrollable>
            <Grid
              itemData={{
                id: sceneObject.id,
                models: results,
                itemSettings,
                onSelectItem,
                selectedFunc: (item) => { return selectedModel.current && selectedModel.current.id === item.id},
                selectInitial: true
              }}
              Component={ModelInspectorItem}
              elements={results}
              numCols={itemSettings.NUM_COLS}
              itemHeight={itemSettings.ITEM_HEIGHT}
            />

          </Scrollable>
        </div>
      </React.Fragment>
    )
  }))

export default HairInspector
