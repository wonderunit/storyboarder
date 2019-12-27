import classNames from 'classnames'
import { remote } from 'electron'
const { dialog } = remote
import LiquidMetal from 'liquidmetal'
import { useState, useMemo, forwardRef } from 'react'
import { connect } from 'react-redux'
import { FixedSizeGrid } from 'react-window'
import prompt from 'electron-prompt'
import {
  updateObject,
  createObject,
  getSceneObjects,
  selectAttachable
} from '../../../shared/reducers/shot-generator'
import ModelLoader from '../../../services/model-loader'
import h from '../../../utils/h'
import FileSelect from '../../attachables/FileSelect'
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

  modelData,

  onSelectItem
}) => {
  const src = filepathFor(model).replace(/.glb$/, '.jpg')

  const onSelect = event => {
    event.preventDefault()
    onSelectItem(sceneObject.id, { model: model })
  }

  const className = classNames({
    'thumbnail-search__item--selected': sceneObject.model === model.id
  })

  // allow a little text overlap
  const slop = GUTTER_SIZE

  return h(['div.thumbnail-search__item', {
    style,
    className,
    onPointerUp: onSelect,
    'data-id': model.id,
    title: model.name
  }, [
    ['figure', { style: { width: IMAGE_WIDTH, height: IMAGE_HEIGHT } }, [
      ['img', { src, style: { width: IMAGE_WIDTH, height: IMAGE_HEIGHT } }]
    ]],
    ['div.thumbnail-search__name', {
      style: {
        width: ITEM_WIDTH + slop,
        height: (ITEM_HEIGHT - IMAGE_HEIGHT - GUTTER_SIZE) + slop
      }
    }, model.name]
  ]])
})

const ListItem = React.memo(({ data, columnIndex, rowIndex, style }) => {
  const { sceneObject } = data
  const model = data.models[columnIndex + (rowIndex * NUM_COLS)]
  const onSelectItem = data.onSelectItem

  if (!model) return h(['div', { style }])

  const filepath = (model.id !== 'box') && filepathFor(model)
  const modelData = data.attachments[filepath] && data.attachments[filepath].value
  return h([
    ModelFileItem, {
      style,

      sceneObject,
      model,

      modelData,

      onSelectItem
    }
  ])
})

const AttachableEditor = connect(
  state => ({
    attachments: state.attachments,
    sceneObjects: getSceneObjects(state),
    allModels: state.models
  }),
  {
    updateObject,
    createObject,
    selectAttachable
  }
)(
  React.memo(({
    sceneObject,

    attachments,

    allModels,
    sceneObjects,
    scene,
    createObject,
    transition,
    rows = 3
  }) => {
  const [terms, setTerms] = useState(null)

  const models = useMemo(
    () => Object.values(allModels).filter(m => m.type === "attachable"),
    [allModels, sceneObject.type]
  )

  const onChange = event => {
    event.preventDefault()
    setTerms(event.currentTarget.value)
  }

  const onSelectItem = (id, { model }) => {
    let skinnedMesh =  scene.children.filter(child => child.userData.id === id)[0].getObjectByProperty("type", "SkinnedMesh")
    let originalSkeleton = skinnedMesh.skeleton

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

    let win = remote.getCurrentWindow()
    prompt({
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
    )
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

  const onSelectFile = event => {
    event.preventDefault()

    const filepaths = dialog.showOpenDialog(null, {})
    if (filepaths) {
      const filepath = filepaths[0]
     // updateObject(sceneObject.id, { model: filepath })
      onSelectItem(sceneObject.id, {model:filepath})
    }

    // automatically blur to return keyboard control
    document.activeElement.blur()
    transition('TYPING_EXIT')
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
  }, [terms])

  // via https://reactjs.org/docs/forwarding-refs.html
  const innerElementType = forwardRef(({ style, ...rest }, ref) => {
    return h([
      'div',
      {
        ref,
        style: {
          ...style,
          width: 288, // cut off the right side gutter
          position: 'relative',
          overflow: 'hidden'
        },
        ...rest
      }
    ])
  })

  const isCustom = ModelLoader.isCustomModel(sceneObject.model)

  return h(
    ['div.thumbnail-search.column', [
      ['div.row', { style: { padding: '6px 0' } }, [
        ['div.column', { style: { flex: 1 } }, [
          ['input', {
            placeholder: 'Search models …',
            onChange
          }]
        ]],
        isCustom
          ? ['div.column', { style: { padding: 2 } }]
          : ['div.column', { style: { alignSelf: 'center', padding: 6, lineHeight: 1 } }, 'or'],
        [FileSelect, { model: sceneObject.model, onSelectFile }],
        [
          'div.column', { style: { width: 20, margin: '0 0 0 6px', alignSelf: 'center', alignItems: 'flex-end' } }, [
            CustomModelHelpButton
          ]
        ]
      ]],

      ['div.thumbnail-search__list', [
        FixedSizeGrid,
        {
          columnCount: NUM_COLS,
          columnWidth: ITEM_WIDTH + GUTTER_SIZE,

          rowCount: Math.ceil(results.length / NUM_COLS),
          rowHeight: ITEM_HEIGHT,

          width: 288,
          height: rows === 2
            ? 248 // built-in Characters list
            : rows * ITEM_HEIGHT, // built-in Models list

          innerElementType,

          itemData: {
            models: results,
            attachments,

            sceneObject,

            onSelectItem
          },
          children: ListItem
        }
      ]]

    ]]
  )
}))

export default AttachableEditor
