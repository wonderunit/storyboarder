const classNames = require('classnames')
const { remote } = require('electron')
const { dialog } = remote
const LiquidMetal = require('liquidmetal')
const path = require('path')
const { useState, useMemo, forwardRef } = require('react')
const { connect } = require('react-redux')
const { FixedSizeGrid } = require('react-window')

const {
  updateObject
} = require('../shared/reducers/shot-generator')
const ModelLoader = require('../services/model-loader')
const h = require('../utils/h')
const { truncateMiddle } = require('../utils')

const GUTTER_SIZE = 6
const ITEM_WIDTH = 91
const ITEM_HEIGHT = 132

const IMAGE_WIDTH = ITEM_WIDTH
const IMAGE_HEIGHT = 100

const ModelFileItem = React.memo(({
  style,

  id,
  selectedModel,
  model,

  onSelectItem
}) => {
  const onSelect = event => {
    event.preventDefault()
    onSelectItem(id, { model: model.id })
  }

  let className = classNames({
    'thumbnail-search__item--selected': selectedModel === model.id
  })

  return h(['div.thumbnail-search__item', {
    style,
    className,
    onPointerDown: onSelect,
    'data-id': model.id,
    title: model.name
  }, [
    ['figure', { style: { width: IMAGE_WIDTH, height: IMAGE_HEIGHT }}, [
      ['img', { style: { width: IMAGE_WIDTH, height: IMAGE_HEIGHT }}]
    ]],
    ['div.thumbnail-search__name', {
      style: {
        width: ITEM_WIDTH,
        height: ITEM_HEIGHT - IMAGE_HEIGHT - GUTTER_SIZE
      },
    }, model.name]
  ]])
})

const ListItem = React.memo(({ data, columnIndex, rowIndex, style }) => {
  let { id, selectedModel } = data
  let model = data.models[columnIndex + (rowIndex * 3)]
  let onSelectItem = data.onSelectItem

  if (!model) return h(['div', { style }])

  return h([
    ModelFileItem, {
      style,

      id,
      selectedModel,
      model,

      onSelectItem
    }
  ])
})

const FileSelect = ({ model, onSelectFile }) => {
  const isCustom = ModelLoader.isCustomModel(model)
  const ext = path.extname(model)
  const basenameWithoutExt = path.basename(model, ext)
  const displayName = truncateMiddle(basenameWithoutExt, 13)

  let className = classNames({
    'button__file--selected': isCustom
  })

  return h(
    ['div.column', { style: { width: 106 }}, [
      [
        'a.button__file[href=#]', {
          style: { flex: 1, width: '100%', height: 34, whiteSpace: 'nowrap', overflow: 'hidden' },
          className,
          onPointerDown: onSelectFile,
          title: isCustom ? path.basename(model) : undefined
        },
        isCustom
          ? displayName
          : 'Select File …'
      ]
    ]]
  )
}

const ModelSelect = connect(
  state => ({
    allModels: state.models
  }),
  {
    updateObject
  }
)(
React.memo(({
  sceneObject,

  allModels,

  updateObject,
  transition
}) => {
  const [terms, setTerms] = useState(null)
  
  const models = useMemo(
    () => Object.values(allModels).filter(m => m.type === sceneObject.type),
    [allModels, sceneObject.type]
  )

  const onChange = event => {
    event.preventDefault()
    setTerms(event.currentTarget.value)
  }

  const onSelectFile = event => {
    event.preventDefault()

    let filepaths = dialog.showOpenDialog(null, {})

    if (filepaths) {
      let filepath = filepaths[0]
      updateObject(sceneObject.id, { model: filepath })
    }

    // automatically blur to return keyboard control
    document.activeElement.blur()
    transition('TYPING_EXIT')
  }

  const onSelectItem = (id, { model }) => {
    updateObject(id, { model })
  }

  const results = useMemo(() => {
    const matchAll = terms == null || terms.length === 0

    return models
      .filter(model =>
        matchAll
          ? true
          : LiquidMetal.score(model.name, terms) > 0.8
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
      },
    ])
  })

  const isCustom = ModelLoader.isCustomModel(sceneObject.model)

  return h(
    ['div.thumbnail-search.column', [
      ['div.row', { style: { padding: '6px 0' } }, [
        ['div.column', { style: { flex: 1 }}, [
          ['input', {
            placeholder: 'Search models …',
            onChange
          }],
        ]],
        isCustom
          ? ['div.column', { style: { padding: 2 }}]
          : ['div.column', { style: { alignSelf: 'center', padding: 6, lineHeight: 1 } }, 'or'],
        [FileSelect, { model: sceneObject.model, onSelectFile }]
      ]],

      ['div.thumbnail-search__list', [
        FixedSizeGrid,
        {
          columnCount: 3,
          columnWidth: ITEM_WIDTH + GUTTER_SIZE,

          rowCount: Math.ceil(results.length / 3),
          rowHeight: ITEM_HEIGHT,

          width: 288,
          height: 363,

          innerElementType,

          itemData: {
            models: results,
            selectedModel: sceneObject.model,
            id: sceneObject.id,
            onSelectItem
          },
          children: ListItem
        }
      ]]

    ]]
  )
}))

module.exports = ModelSelect
