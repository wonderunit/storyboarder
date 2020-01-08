import React, {  useCallback} from 'react'
import LiquidMetal from 'liquidmetal'

const SearchList = React.memo(({ list, onSearch, label = "Search models …"}) => {

    const onSearchChange = useCallback((event) => {
        let terms = event.currentTarget.value
        const matchAll = terms == null || terms.length === 0
        let filteredList = list.filter(model => matchAll
            ? true
            : LiquidMetal.score(
              model.value,
              terms
            ) > 0.8)
        onSearch(filteredList)
    }, [])

    return <div className="column" style={{ flex: 1 }}> 
            <input
              placeholder={ label }
              onChange={ onSearchChange }> 
            </input>
        </div>
})

export default SearchList
