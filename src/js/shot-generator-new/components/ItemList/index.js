import React, {useCallback} from 'react'
import {connect} from 'react-redux'

import {remote} from 'electron'
const {dialog} = remote

import {
  getSceneObjects,
  getSelections,
  getActiveCamera, selectObject, deleteObjects, updateObject
} from './../../../shared/reducers/shot-generator'

import deepEqualSelector from './../../../utils/deepEqualSelector'
import Item from "./Item";

const sortPriority = ['camera', 'character', 'object', 'image', 'light', 'volume', 'group']

const getSortedItems = (sceneObjectsArray) => {
  const headItems = sceneObjectsArray
    .sort((prev, current) => sortPriority.indexOf(prev.type) - sortPriority.indexOf(current.type))
    .filter(object => !!object.group === false)
  
  const sortedItems = []
  
  for (let object of headItems) {
    sortedItems.push(object)
    if (object.children) {
      sortedItems.push(...sceneObjectsArray.filter(target => target.group === object.id))
    }
  }
  
  return sortedItems
}


const ItemList = React.memo(({sceneObjects, selections, activeCamera, selectObject, deleteObjects, updateObject}) => {
  const onSelectItem = useCallback((event, props) => {
    if (!props) {
      return false
    }

    let currentSelections = props.children ? [...props.children, props.id] : [props.id]
    if (event.shiftKey) {
      if (selections.indexOf(props.id) === -1) {
        currentSelections.push(...selections, props.id)
      } else {
        currentSelections = selections.filter(id => currentSelections.indexOf(id) === -1)
      }
    }
    
    selectObject([...new Set(currentSelections)])
  }, [selections])

  const onHideItem = useCallback((event, props) => {
    let nextVisibility = !props.visible
    updateObject(props.id, {visible: nextVisibility})
    if (props.children) {
      for (let child of props.children) {
        updateObject(child, {visible: nextVisibility})
      }
    }
  }, [])

  const onLockItem = useCallback((event, props) => {
    let nextAvailability = !props.locked
    updateObject(props.id, {locked: nextAvailability})
    if (props.children) {
      for (let child of props.children) {
        updateObject(child, {locked: nextAvailability})
      }
    }
  }, [])
  
  const onDeleteItem = useCallback((event, props) => {
    let choice = dialog.showMessageBox(null, {
      type: 'question',
      buttons: ['Yes', 'No'],
      message: 'Are you sure?',
      defaultId: 1 // default to No
    })
    if (choice === 0) {
      deleteObjects(props.children ? [...props.children, props.id] : [props.id])
    }
  }, [])
  
  const Items = getSortedItems(sceneObjects).map((props, index) => {
    const allowDelete = props.type !== 'camera' || (props.type === 'camera' && activeCamera !== props.id)
    
    return (
      <Item
          selected={selections.indexOf(props.id) !== -1}
          index={index}
          key={props.id}
          allowDelete={allowDelete}
          activeCamera={activeCamera}
          onSelectItem={onSelectItem}
          onHideItem={onHideItem}
          onLockItem={onLockItem}
          onDeleteItem={onDeleteItem}
          {...props}
      />
    )
  })
  
  return (
      <div>
        <Item
            selected={selections.length === 0}
            index={0}
            displayName='Scene'
            id={null}
            onSelectItem={onSelectItem}
        />
        {Items}
      </div>
  )
})

const getSceneObjectsM = deepEqualSelector([getSceneObjects], (sceneObjects) => {
  return Object.values(sceneObjects).map((object) => {
    return {
      id:           object.id,
      displayName:  object.displayName,
      group:        object.group || null,
      children:     object.children || null,
      visible:      Boolean(object.visible),
      locked:       Boolean(object.locked),
      type:         object.type
    }
  })
})
const getSelectionsM = deepEqualSelector([getSelections], selections => selections)

const mapStateToProps = (state) => ({
  sceneObjects: getSceneObjectsM(state),
  selections: getSelectionsM(state),
  activeCamera: getActiveCamera(state)
})

const mapDispatchToProps = {
  selectObject,
  deleteObjects,
  updateObject
}

export default connect(mapStateToProps, mapDispatchToProps)(ItemList)
