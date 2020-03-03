import React from 'react'
import AttachableInfoItem from './AttachableInfoItem'

const ListItem = React.memo(({ props, attachable }) => {
    const { getNumberSlider, onSelectItem, onDelete } = props
    return <AttachableInfoItem
          sceneObject={ attachable }
          onSelectItem={ onSelectItem }
          onDelete={ onDelete }
          getNumberSlider={ getNumberSlider }/>
  })

export default ListItem