import React, {useCallback} from 'react'
import {connect} from 'react-redux'

import {
  getSceneObjects,
  getSelections,
  getActiveCamera, selectObject, deleteObjects, updateObject
} from './../../../shared/reducers/shot-generator'

import memoizeResult from './../../../utils/memoizeResult'
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
    if (!props || selections.indexOf(props.id) !== -1) {
      console.log('Already selected')
      return false
    }

    selectObject(props.id)
  }, [])

  const onHideItem = useCallback((event, props) => {
    updateObject(props.id, {visible: !props.visible})
  }, [])

  const onLockItem = useCallback((event, props) => {
    updateObject(props.id, {locked: !props.locked})
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
          {...props}
      />
    )
  })
  
  console.log('Rerender')
  
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

const getSceneObjectsM = memoizeResult((state) => {
  return Object.values(getSceneObjects(state)).map((object) => {
    return {
      id:           object.id,
      displayName:  object.displayName,
      group:        object.group,
      children:     object.children,
      visible:      object.visible,
      locked:       object.locked,
      type:         object.type
    }
  })
})
const getSelectionsM = memoizeResult(getSelections)

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
