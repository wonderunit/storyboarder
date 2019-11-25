const { remote } = require('electron')
const { useMemo, forwardRef } = require('react')
const { connect } = require('react-redux')
const { FixedSizeGrid } = require('react-window')
const prompt = require('electron-prompt')
const {
  updateObject,
  deleteObjects,
  getSceneObjects,
  undoGroupEnd, 
  undoGroupStart
} = require('../../shared/reducers/shot-generator')
const h = require('../../utils/h')
const NumberSliderComponent = require('../NumberSlider')
const NumberSlider = connect(null, {
  onDragStart: undoGroupStart,
  onDragEnd: undoGroupEnd
})(NumberSliderComponent.NumberSlider)
const ITEM_HEIGHT = 132
const NUM_COLS = 1

const AttachableInfoItem  = React.memo(({
    sceneObject,
    attachable,
    onSelectItem,
    updateObject,
    deleteObjects
  
}) => {
    const onHandSelect = () => {
        onSelectItem(sceneObject.id, sceneObject.bindBone )
    }
    const buttonName = useMemo(() => sceneObject.bindBone, [sceneObject.bindBone])
    const attachableName = useMemo(() => { 
        let model = attachable.children.filter(child => child.userData.name)[0]
        return !model.userData.name ? '' : model.userData.name
    })

    return h(['div.attachable-card', 
        ['div.attachable-card___title', 
          ['div.attachable-card___label', attachableName],
          ['a.attachable-card__discard[href=#]', { onClick: () => { deleteObjects([sceneObject.id])} }, 'X']
        ],
        ['div.number-slider',
          ['div.number-slider__label', "Attached to bone"], 
          ['div.column', { style: { marginLeft: 5 }}, [
            ['a.button_add[href=#]', {
                style: { width: 161, height: 35 },
                onPointerDown: onHandSelect
                }, buttonName]
          ]]],
        [NumberSlider, {
              label: 'size',
              value: sceneObject.size,
              min: 0.7,
              max: 2,
              onSetValue: value => {updateObject(
                sceneObject.id,
                { size: value }
              )}
            }
        ]
    ])
})

const ListItem = React.memo(({ data, columnIndex, rowIndex, style }) => {
  const { sceneObjects, attachables } = data
  const onSelectItem = data.onSelectItem
  const updateObject = data.updateObject
  const deleteObjects = data.deleteObjects
  let attachable = attachables[rowIndex]
  let sceneObject = sceneObjects[attachable.userData.id]
  if (!attachable) return h(['div', { style }])
  return h([
    AttachableInfoItem,
    {
        sceneObject,
        attachable,
        onSelectItem,
        updateObject,
        deleteObjects
    }
  ])
})

const AttachableInfo = connect(
  state => ({
    sceneObjects: getSceneObjects(state),
  }),
  {
    updateObject,
    deleteObjects
  }
)(
  React.memo(({
    sceneObject,
    scene,
    updateObject,
    deleteObjects,
    selectedAttachable,
    rows = 3,
    sceneObjects
  }) => {
  const onSelectItem = (id, bindBoneName) => {
    currentSkeleton = sceneObjects[sceneObject.id]
    let skinnedMesh = scene.children.filter(child => child.userData.id === sceneObject.id)[0].getObjectByProperty("type", "SkinnedMesh")
    let originalSkeleton = skinnedMesh.skeleton
    let selectOptions = {}
    for(let i = 0; i < originalSkeleton.bones.length; i++) {
      if(!originalSkeleton.bones[i].name.includes("leaf"))
        selectOptions[originalSkeleton.bones[i].name] = originalSkeleton.bones[i].name
    }
    // show a prompt to get the desired preset name
    let win = remote.getCurrentWindow()
    prompt({
      title: 'Preset Name',
      lable: 'Select which hand to save',   
      type: 'select',
      value: bindBoneName,
      selectOptions
    }, win).then(name => { 
      if (name == null || name == '' || name == ' ') return
      let bone = originalSkeleton.getBoneByName(name)
      
      let {x, y, z} = bone.worldPosition()
      updateObject(id, {x, y, z,  bindBone: bone.name })
    })
  }

  const attachables = useMemo(() => {
      let character = scene.children.filter(child => child.userData.id === sceneObject.id)[0]
      return !character ? [] : character.attachables ? character.attachables : []
  }, [sceneObjects, sceneObject])

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

  return h(
    ['div.thumbnail-search.column', [
      ['div.thumbnail-search__list', [
        FixedSizeGrid,
        {
          columnCount: NUM_COLS,
          columnWidth: 288,

          rowCount: attachables.length,
          rowHeight: ITEM_HEIGHT,
 
          width: 288,
          height: rows === 2
            ? 248 // built-in Characters list
            : rows * ITEM_HEIGHT, // built-in Models list

          innerElementType,

          itemData: {
            selectedAttachable,
            attachables,

            sceneObjects,

            onSelectItem,
            updateObject,
            deleteObjects
          },
          children: ListItem
        }
      ]]
    ]]
  )
}))

module.exports = AttachableInfo
