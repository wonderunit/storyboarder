import classNames from 'classnames'
import { remote } from 'electron'
const { dialog } = remote
import LiquidMetal from 'liquidmetal'
import { useState, useMemo, forwardRef, useEffect } from 'react'
import { connect } from 'react-redux'
import { FixedSizeGrid } from 'react-window'
import prompt from 'electron-prompt'
import {
  updateObject,
  createObject,
  selectAttachable,
  getSceneObjects
} from '../../../shared/reducers/shot-generator'
import ModelLoader from '../../../services/model-loader'
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

  onSelectItem
}) => {
  const src = filepathFor(model).replace(/.glb$/, '.jpg')

  const onSelect = event => {
    event.preventDefault()
    onSelectItem(sceneObject.id, { model: model })
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
  const { sceneObject } = data
  const model = data.models[columnIndex + (rowIndex * NUM_COLS)]
  const onSelectItem = data.onSelectItem

  if (!model) return <div/>
  console.log("render")
  return <ModelFileItem
      style={ style }
      sceneObject={ sceneObject }
      model={ model }
      onSelectItem={ onSelectItem } />
})

const AttachableEditor = connect(
  state => ({
    allModels: state.models
  }),
  {
    updateObject,
    createObject,
    selectAttachable,
    withState: (fn) => (dispatch, getState) => fn(dispatch, getState())
  }
)(
  React.memo(({
    id,
    model,
    withState,

    allModels,
    scene,
    createObject,
    transition,
    rows = 3
  }) => {
  const [terms, setTerms] = useState(null)
  console.log("Render")
  const [sceneObject, setSceneObject] = useState({})
  const models = useMemo(
    () => Object.values(allModels).filter(m => m.type === "attachable"),
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

  return sceneObject.model && <div className="thumbnail-search column"> 
        <div className="row" style={{ padding: "6px 0" }}> 
          <div className="column" style={{ flex: 1 }}> 
            <input
              placeholder="Search models …"
              onChange={ onSearchChange }> 
            </input>
          </div>
           { ModelLoader.isCustomModel(sceneObject.model) ? <div className="column" style={{ padding: 2 }} />
            : <div className="column" style={{ alignSelf: "center", padding: 6, lineHeight: 1 } }>or</div>
            }
            <FileSelect model={ sceneObject.model } onSelectFile={ onSelectFile } />
            <div className="column" style= {{ width: 20, margin: "0 0 0 6px", alignSelf: "center", alignItems: "flex-end" }}>
              <CustomModelHelpButton/>
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
}))

export default AttachableEditor
