const SimpleGrid = React.memo(({style, Tag, elements, selectedFunc, ...props}) => {
   return <div className="row" style={style}>          
    { elements.map((item, index) => <Tag 
        key={ index }
        index={ index }
        item={ item } 
        isSelected={selectedFunc(item)}
        {...props}
        />)}
    </div>
})
export default SimpleGrid