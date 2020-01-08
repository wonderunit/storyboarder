import React, { useMemo, useState} from 'react'

const SearchList = React.memo(({ titleContent, initializeGrid, itemsFilter}) => {
    const [terms, setTerms] = useState(null)
    const onSearchChange = (event) => {
        event.preventDefault()
        setTerms(event.currentTarget.value)
    }
    const results = useMemo(() => {
        return itemsFilter(terms)
    }, [terms])

    return <div className="thumbnail-search column"> 
        <div className="row" style={{ padding: "6px 0" }}> 
            <div className="column" style={{ flex: 1 }}> 
                <input
                  placeholder="Search models …"
                  onChange={ onSearchChange }> 
                </input>
            </div>
            { titleContent }
        </div>
        <div className="thumbnail-search__list">
            { initializeGrid(results) }
        </div>
    </div> 
})

export default SearchList
