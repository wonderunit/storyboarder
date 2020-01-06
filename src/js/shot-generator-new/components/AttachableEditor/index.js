import { remote } from 'electron'
import path from 'path'
const { dialog } = remote
import LiquidMetal from 'liquidmetal'
import React, { useState, useRef, useMemo, forwardRef, useEffect, useContext, useCallback } from 'react'
import { connect } from 'react-redux'
import { FixedSizeGrid } from 'react-window'
import prompt from 'electron-prompt'
import {
  createObject,
  selectAttachable,
  getSceneObjects,
  getSelectedAttachable
} from '../../../shared/reducers/shot-generator'
import ModelLoader from '../../../services/model-loader'
import FileInput from '../FileInput'
import classNames from 'classnames'
import HelpButton from '../HelpButton'

import { GUTTER_SIZE, ITEM_WIDTH, ITEM_HEIGHT, NUM_COLS } from './ItemSettings'
import ListItem from './ListItem'
import deepEqualSelector from "../../../utils/deepEqualSelector"
import HandSelectionModal from '../HandSelectionModal'

const getModelsM = deepEqualSelector([(state) => state.models], (models) => models)
const AttachableEditor = connect(
  state => ({
    allModels: getModelsM(state),
    selectedAttachable: getSelectedAttachable(state)
  }),
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
    selectedAttachable,
    allModels,
    createObject,
    rows = 3
  }) => {
  const { scene } = useContext(SceneContext)
  const [terms, setTerms] = useState(null)
  const [sceneObject, setSceneObject] = useState({})
  const selectedModel = useRef(null)
  const selectedId = useRef(null)
  const [isModalVisible, showModal] = useState(false)
  const models = useMemo(
    () => Object.values(allModels).filter(m => m.type === "attachable"),
    [allModels, sceneObject.type]
  )
  useEffect(() => {
    withState((dispatch, state) => {
      setSceneObject(getSceneObjects(state)[id])
    })
  }, [id])

  const onSearchChange = event => {
    event.preventDefault()
    setTerms(event.currentTarget.value)
  }
  const getSkeleton = () => {
    if(!sceneObject) return
    console.log(id)
    console.log(scene)
    let character = scene.children.filter(child => child.userData.id === id)[0]
    if(!character) return 
    let skinnedMesh = character.getObjectByProperty("type", "SkinnedMesh")
    return skinnedMesh.skeleton
  }

  const onSelectItem = (id, { model }) => {
    let originalSkeleton = getSkeleton()
    selectedModel.current = model
    selectedId.current = id
    let bone = originalSkeleton.getBoneByName(model.bindBone)
    if(bone) {
      createAttachableElement(model, originalSkeleton, id, {bindBone: bone})
      return
    }

    let selectOptions = {}
    for(let i = 0; i < originalSkeleton.bones.length; i++) {
      if(!originalSkeleton.bones[i].name.includes("leaf"))
        selectOptions[originalSkeleton.bones[i].name] = originalSkeleton.bones[i].name
    }
    showModal(true)
   // let win = remote.getCurrentWindow()
   /*  prompt({
      title: 'Preset Name',
      lable: 'Select which hand to save',   
      type: 'select',
      selectOptions
    }, win).then(name => {
      if (name != null && name != '' && name != ' ') {
        createAttachableElement(model, originalSkeleton, id, {name: name})
        }
    }).catch(err =>
      console.error(err)
    ) */
  }

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
  }, [terms])

  // via https://reactjs.org/docs/forwarding-refs.html
  const innerElementType = forwardRef(({ style, ...rest }, ref) => {
    let newStyle = {
      width:288,
      position:'relative',
      overflow:'hidden',
      ...style
    }
    return <div
        ref={ref}
        style={newStyle}
        {...rest}/>
  })
  console.log(selectedAttachable)

  const isCustom = selectedAttachable && ModelLoader.isCustomModel(selectedAttachable)
  const refClassName = classNames( "button__file", {
    "button__file--selected": isCustom
  })
  const wrapperClassName = "button__file__wrapper"

  return sceneObject.model && <div>
    <HandSelectionModal
        visible={ isModalVisible }
        model={ selectedModel.current }
        setVisible={ showModal }
        id={ selectedId.current }
        skeleton={ getSkeleton() }
        onSuccess= { createAttachableElement }
    />
    <div className="thumbnail-search column"> 
        <div className="row" style={{ padding: "6px 0" }}> 
          <div className="column" style={{ flex: 1 }}> 
            <input
              placeholder="Search models …"
              onChange={ onSearchChange }> 
            </input>
          </div>
           { isCustom ? <div className="column" style={{ padding: 2 }} />
            : <div className="column" style={{ alignSelf: "center", padding: 6, lineHeight: 1 } }>or</div>
            }
            <FileInput value={ isCustom ? selectValue() : "Select File …" } 
                     title={ isCustom ? path.basename(sceneObject.model) : undefined } 
                     onChange={ onSelectFile } 
                     refClassName={ refClassName }
                     wrapperClassName={ wrapperClassName }/>
            <div className="column" style= {{ width: 20, margin: "0 0 0 6px", alignSelf: "center", alignItems: "flex-end" }}>
            <HelpButton
                url="https://github.com/wonderunit/storyboarder/wiki/Creating-custom-3D-Models-for-Shot-Generator"
                title="How to Create 3D Models for Custom Objects"/>
            </div>
        </div>
        <div className="thumbnail-search__list">
         <FixedSizeGrid 
            columnCount={ NUM_COLS }
            columnWidth={ ITEM_WIDTH + GUTTER_SIZE }
            rowCount={ Math.ceil(results.length / NUM_COLS) }
            rowHeight={ ITEM_HEIGHT }
            width={ 288 }
            height={ rows === 2 ? 248 : rows * ITEM_HEIGHT }
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
