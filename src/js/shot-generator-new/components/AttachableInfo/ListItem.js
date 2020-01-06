import React from 'react'
import AttachableInfoItem from './AttachableInfoItem'

const ListItem = React.memo(({ props, attachable }) => {
    const { sceneObjects, getNumberSlider, onSelectItem, onDelete} = props
    let sceneObject = sceneObjects[attachable.userData.id]
    console.log("Render")
    return <AttachableInfoItem
          sceneObject={ sceneObject }
          onSelectItem={ onSelectItem }
          onDelete={ onDelete }
          getNumberSlider={ getNumberSlider }/>
  })

export default ListItem