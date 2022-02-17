import React, {useCallback, useRef, useEffect} from 'react'
import {connect} from 'react-redux'

const remote = require('@electron/remote')
const {dialog} = remote

import {
  getSceneObjects,
  getSelections,
  getActiveCamera, selectObject, deleteObjects, updateObject,
  setActiveCamera
} from './../../../shared/reducers/shot-generator'

import deepEqualSelector from './../../../utils/deepEqualSelector'
import Item from './Item'
import clampElementToView from '../../../utils/clampElementToView'

const sortPriority = ['camera', 'character', 'object', 'image', 'light', 'volume', 'group']

const getSortedItems = (sceneObjectsArray) => {
  const headItems = sceneObjectsArray
    .filter(object => sortPriority.indexOf(object.type) !== -1)
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

const isSelected = (id, selections, children = []) => {
  if (!children || children.length === 0) {
    return selections.indexOf(id) !== -1
  }
  
  const unselectedChildren = children.filter((child) => {
    return selections.indexOf(child) === -1
  })
  
  return unselectedChildren.length === 0
}

const ItemList = React.memo(({sceneObjects, selections, activeCamera, selectObject, deleteObjects, updateObject, setActiveCamera, withState}) => {
  const listRef = useRef(null)
  
  const onSelectItem = useCallback((event, props) => {
    if (!props) {
      if (selections.length) {
        selectObject(null)
      }
      
      return false
    }

    let currentSelections = props.children ? [props.id, ...props.children] : [props.id]
    if (event.shiftKey) {
      if (selections.indexOf(props.id) === -1) {
        currentSelections.push(props.id, ...selections)
      } else {
        currentSelections = selections.filter(id => currentSelections.indexOf(id) === -1)
      }
    }
    
    selectObject([...new Set(currentSelections)])
    if(props.type === "camera") {
      setActiveCamera(props.id)
    }
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
    dialog.showMessageBox(null, {
      type: 'question',
      buttons: ['Yes', 'No'],
      message: 'Are you sure?',
      defaultId: 1 // default to No
    })
    .then(({ response }) => {
      if (response === 0) {
        let idsToRemove = props.children ? [...props.children, props.id] : [props.id]
        if(props.type === "character") {
          withState((dispatch, state) => {
            let sceneObjects = getSceneObjects(state)
            let attachableIds = Object.values(sceneObjects).filter(obj => obj.attachToId === props.id).map(obj => obj.id)
            idsToRemove = attachableIds.concat(idsToRemove)
          })
        }
        deleteObjects(idsToRemove)
      }
    })
    .catch(err => console.error(err))
  }, [])
  
  const sortedList = getSortedItems(sceneObjects)

  useEffect(() => {
    if (listRef.current) {
      clampElementToView(listRef.current, selections[0] ? sortedList.findIndex(object => object.id === selections[0]) + 1 : 0)
    }
  }, [listRef.current, selections[0]])
  
  const Items = sortedList.map((props, index) => {
    const allowDelete = props.type !== 'camera' || (props.type === 'camera' && activeCamera !== props.id)
    
    return (
      <Item
          selected={isSelected(props.id, selections, props.children)}
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
      <div
          className = "objects-list"
          ref={listRef}
      >
        <Item
            selected={selections.length === 0}
            index={0}
            displayName="Scene"
            id={null}
            onSelectItem={onSelectItem}
        />
        {Items}
      </div>
  )
})

const sceneObjectSelector = (state) => {
  const sceneObjects = getSceneObjects(state)
  return Object.values(sceneObjects).map((object) => {
    return {
      id:           object.id,
      displayName:  object.displayName,
      group:        object.group || null,
      children:     object.children || null,
      visible:      Boolean(object.visible),
      locked:       Boolean(object.locked),
      type:         object.type,
      name:         object.name
    }
  })
}
const getSceneObjectsM = deepEqualSelector([sceneObjectSelector], (sceneObjects) => sceneObjects)
const getSelectionsM = deepEqualSelector([getSelections], selections => selections)

const mapStateToProps = (state) => ({
  sceneObjects: getSceneObjectsM(state),
  selections: getSelectionsM(state),
  activeCamera: getActiveCamera(state)
})

const mapDispatchToProps = {
  selectObject,
  deleteObjects,
  updateObject,
  setActiveCamera,
  withState: (fn) => (dispatch, getState) => fn(dispatch, getState())
}

export default connect(mapStateToProps, mapDispatchToProps)(ItemList)
