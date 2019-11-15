const classNames = require('classnames')
const { remote } = require('electron')
const { dialog } = remote
const LiquidMetal = require('liquidmetal')
const path = require('path')
const { useState, useMemo, forwardRef } = require('react')
const { connect } = require('react-redux')
const { FixedSizeGrid } = require('react-window')
const prompt = require('electron-prompt')
const {
  updateObject,
  createObject,
  getSceneObjects
} = require('../../shared/reducers/shot-generator')
const ModelLoader = require('../../services/model-loader')
const h = require('../../utils/h')
const { truncateMiddle } = require('../../utils')

const CustomModelHelpButton = require('../CustomModelHelpButton')

const GUTTER_SIZE = 5
const ITEM_WIDTH = 68
const ITEM_HEIGHT = 132

const IMAGE_WIDTH = ITEM_WIDTH
const IMAGE_HEIGHT = 100

const NUM_COLS = 4
const shortId = id => id.toString().substr(0, 7).toLowerCase()
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
  console.log(model)
  const src = filepathFor(model).replace(/.glb$/, '.jpg')

  const onSelect = event => {
    event.preventDefault()
    onSelectItem(sceneObject.id, { model: model.id })
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

const FileSelect = ({ model, onSelectFile }) => {
  const isCustom = ModelLoader.isCustomModel(model)
  const ext = path.extname(model)
  const basenameWithoutExt = path.basename(model, ext)
  const displayName = truncateMiddle(basenameWithoutExt, 13)

  const className = classNames({
    'button__file--selected': isCustom
  })

  return h(
    ['div.column', { style: { width: 106 } }, [
      [
        'a.button__file[href=#]', {
          style: { flex: 1, width: '100%', height: 34, whiteSpace: 'nowrap', overflow: 'hidden' },
          className,
          onPointerUp: onSelectFile,
          title: isCustom ? path.basename(model) : undefined
        },
        isCustom
          ? displayName
          : 'Select File …'
      ]
    ]]
  )
}

const AccessoryEditor = connect(
  state => ({
    attachments: state.attachments,

    allModels: state.models
  }),
  {
    updateObject,
    createObject,
    withState: (fn) => (dispatch, getState) => fn(dispatch, getState())
  }
)(
  React.memo(({
    sceneObject,

    attachments,

    allModels,

    withState,
    scene,
    updateObject,
    createObject,
    transition,

    rows = 3
  }) => {
  const [terms, setTerms] = useState(null)

  const models = useMemo(
    () => Object.values(allModels).filter(m => m.type === "accessory"),
    [allModels, sceneObject.type]
  )

  const onChange = event => {
    event.preventDefault()
    setTerms(event.currentTarget.value)
  }

  const onSelectFile = event => {
    event.preventDefault()

    const filepaths = dialog.showOpenDialog(null, {})
    console.log(filepath)
    if (filepaths) {
      const filepath = filepaths[0]
      updateObject(sceneObject.id, { model: filepath })
    }

    // automatically blur to return keyboard control
    document.activeElement.blur()
    transition('TYPING_EXIT')
  }

  const onSelectItem = (id, { model }) => {

    withState((dispatch, state) => {
      currentSkeleton = getSceneObjects(state)[sceneObject.id]
    })
    let skinnedMesh =  scene.children.filter(child => child.userData.id === id)[0].getObjectByProperty("type", "SkinnedMesh")
    let originalSkeleton = skinnedMesh.skeleton
   // console.log(originalSkeleton)
    let selectOptions = {}
    for(let i = 0; i < originalSkeleton.bones.length; i++) {
      if(!originalSkeleton.bones[i].name.includes("leaf"))
        selectOptions[originalSkeleton.bones[i].name] = originalSkeleton.bones[i].name
    }
    console.log(attachments)
    // show a prompt to get the desired preset name
    let win = remote.getCurrentWindow()
    prompt({
      title: 'Preset Name',
      lable: 'Select which hand to save',   
      type: 'select',
      selectOptions
    }, win).then(name => {
      if (name != null && name != '' && name != ' ') {
        let bone = originalSkeleton.getBoneByName(name)
        //let accessory = object.scene.children[0].clone()
       // accessory.applyMatrix(skinnedMesh.getInverseMatrixWorld())
       // bone.add(accessory)
        let key = THREE.Math.generateUUID()
        let element = {
          id: key,
          type: 'accessory',
        
          x:0, y: 0, z: 0,

          model: model,
          bindBone: name,
          attachToId: id
         }
         createObject(element)
        }
    }).catch(err =>
      console.error(err)
    )
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

module.exports = AccessoryEditor
