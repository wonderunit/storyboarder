import ModelFileItem from '../ModelFileItem'
import * as ItemSettings from './ItemSettings' 

const ListItem = React.memo(({ id, isSelected, item, index, elementStyle, currentRow, currentColumn, onSelectItem}) => {
    if (!item) return <div/>
    let newElementStyle = {position: elementStyle.position, width: elementStyle.width, height: elementStyle.height}
    newElementStyle.top = elementStyle.height * Math.floor(currentRow)
    newElementStyle.left = elementStyle.width * currentColumn
    return item && <ModelFileItem 
        style={ newElementStyle } 
        id={ id }
        isSelected={ isSelected }
        model={ item }
        onSelectItem={ onSelectItem }
        itemSettings={ ItemSettings }/>
})
export default ListItem