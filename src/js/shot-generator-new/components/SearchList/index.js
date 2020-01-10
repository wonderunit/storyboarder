import React, {  useCallback} from 'react'
import LiquidMetal from 'liquidmetal'

const SearchList = React.memo(({ list, onSearch, label = "Search models …"}) => {

    const onSearchChange = useCallback((event) => {
        let terms = event.currentTarget.value
        const matchAll = terms == null || terms.length === 0
        let filteredList = list.filter(model => {
            if(matchAll) return true
            let values = model.value.split("|")
            for(let i = 0; i < values.length; i++) {
             if(LiquidMetal.score(values[i], terms) > 0.8) return true
            }
            return false
            })
        onSearch(filteredList)
    }, [list])

    return <div className="column" style={{ flex: 1 }}> 
            <input
              placeholder={ label }
              onChange={ onSearchChange }> 
            </input>
        </div>
})

export default SearchList
