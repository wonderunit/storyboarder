import { NUM_COLS } from './ItemSettings'
import ModelFileItem from './ModelFileItem'

const ListItem = React.memo(({ id, isSelected, model, style, index, onSelectItem}) => {
    if (!model) return <div/>
    let currentRow = index / NUM_COLS 
    let currentCol = index % (NUM_COLS)
    let newElementStyle = {position: style.position, width: style.width, height: style.height}
    newElementStyle.top = style.height * Math.floor(currentRow)
    newElementStyle.left = style.width * currentCol
  
    return model && <ModelFileItem 
        style={ newElementStyle } 
        id={ id }
        isSelected={ isSelected }
        model={ model }
        onSelectItem={ onSelectItem }/>
})
export default ListItem