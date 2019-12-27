
import ModelFileItem from "./ModelFileItem"
import {NUM_COLS} from "./ItemSettings"
import React from "react"
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
  export default ListItem