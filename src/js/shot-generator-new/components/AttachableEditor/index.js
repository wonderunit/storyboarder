import path from 'path'
import React, { useState, useRef, useMemo, forwardRef, useEffect, useContext, useCallback } from 'react'
import { connect } from 'react-redux'
import { FixedSizeGrid } from 'react-window'
import {
  createObject,
  selectAttachable,
  getSceneObjects
} from '../../../shared/reducers/shot-generator'
import FileInput from '../FileInput'
import classNames from 'classnames'
import HelpButton from '../HelpButton'

import { GUTTER_SIZE, ITEM_WIDTH, ITEM_HEIGHT, NUM_COLS, innerElementType } from '../../utils/InspectorElementsSettings'
import ListItem from './ListItem'
import HandSelectionModal from '../HandSelectionModal'
import SearchList from '../SearchList'

const AttachableEditor = connect(
  state => ({}),
  {
    createObject,
    selectAttachable,
    withState: (fn) => (dispatch, getState) => fn(dispatch, getState())
  }
)(
  React.memo(({
    id,
    withState,
    SceneContext,
    createObject,
    rows = 3
  }) => {
  const { scene } = useContext(SceneContext)
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
      attachableModels = Object.values(allModels).filter(m => m.type === "attachable")
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

  const getSkeleton = () => {
    if(!sceneObject) return
    let character = scene.children.filter(child => child.userData.id === id)[0]
    if(!character) return 
    let skinnedMesh = character.getObjectByProperty("type", "SkinnedMesh")
    return skinnedMesh.skeleton
  }

  const onSelectItem = useCallback((id, { model }) => {
    let originalSkeleton = getSkeleton()
    selectedModel.current = model
    selectedId.current = id
    let bone = originalSkeleton.getBoneByName(model.bindBone)
    if(bone) {
      createAttachableElement(model, originalSkeleton, id, {bindBone: bone})
      return
    }
    showModal(true)
  }, [scene.children.length])

  const createAttachableElement = (model, originalSkeleton, id, {bindBone = null, name = null }) => {
    if(!bindBone && !name) return 
    let bone = bindBone ? bindBone : originalSkeleton.getBoneByName(name)
    let character = originalSkeleton.bones[0].parent
    bone.updateWorldMatrix(true, true)
    let modelData = model
    let modelPosition = new THREE.Vector3()
    let quat = null
    if(!(modelData instanceof Object)) {
      modelData = {
        id: model,
        name: model
      }
      modelPosition.copy(bone.worldPosition())
      quat = bone.worldQuaternion()
    } else {
      let {x, y, z} = model
      modelPosition.set(x, y, z)
      modelPosition.multiplyScalar(1 / character.worldScale().x)
      let newGroup = new THREE.Object3D()
      newGroup.rotation.set(model.rotation.x, model.rotation.y, model.rotation.z)
      newGroup.position.copy(modelPosition)
      bone.add(newGroup)
      bone.updateWorldMatrix(true, true)
      modelPosition = newGroup.worldPosition()
      quat = newGroup.worldQuaternion()
      bone.remove(newGroup)
    }

    let euler = new THREE.Euler().setFromQuaternion(quat)
    let key = THREE.Math.generateUUID()
    let element = {
      id: key,
      type: 'attachable',
    
      x: modelPosition.x, y: modelPosition.y, z: modelPosition.z,

      model: modelData.id,
      name: modelData.name,
      bindBone: bone.name,
      attachToId: id,
      size: 1,
      rotation: { x: euler.x, y: euler.y, z: euler.z },
     }
     createObject(element)
     selectAttachable({id: element.id, bindId: element.attachToId })
  }

  const onSelectFile = useCallback((filepath) => {
    if (filepath.file) {
      onSelectItem(id, { model: filepath.file })
    }
  }, [id])

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
  const actualRowCount = Math.ceil(results.length / NUM_COLS)
  return sceneObject.model && <div>
    <HandSelectionModal
        visible={ isModalVisible }
        model={ selectedModel.current }
        setVisible={ showModal }
        id={ selectedId.current }
        skeleton={ getSkeleton() }
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
        <div className="thumbnail-search__list">
          <FixedSizeGrid 
            columnCount={ NUM_COLS }
            columnWidth={ ITEM_WIDTH + GUTTER_SIZE }
            rowCount={actualRowCount }
            rowHeight={ ITEM_HEIGHT }
            width={ 288 }
            height={ actualRowCount <= rows ? actualRowCount * ITEM_HEIGHT : rows === 2 ? 248 : rows * ITEM_HEIGHT }
            innerElementType={ innerElementType }
            itemData={{
               models: results,
               sceneObject,
               onSelectItem
            }}
            children={ ListItem }/>
        </div>
      </div> 
    </div>
}))

export default AttachableEditor
