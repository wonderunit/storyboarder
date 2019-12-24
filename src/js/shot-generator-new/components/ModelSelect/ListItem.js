import { NUM_COLS } from './ItemSettings'
import ModelFileItem from './ModelFileItem'

const ListItem = React.memo(({ id, isSelected, item, index, elementStyle, onSelectItem}) => {
    if (!item) return <div/>
    let currentRow = index / NUM_COLS 
    let currentCol = index % (NUM_COLS)
    let newElementStyle = {position: elementStyle.position, width: elementStyle.width, height: elementStyle.height}
    newElementStyle.top = elementStyle.height * Math.floor(currentRow)
    newElementStyle.left = elementStyle.width * currentCol
    return item && <ModelFileItem 
        style={ newElementStyle } 
        id={ id }
        isSelected={ isSelected }
        model={ item }
        onSelectItem={ onSelectItem }/>
})
export default ListItem