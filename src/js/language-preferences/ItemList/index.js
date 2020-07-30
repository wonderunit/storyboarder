import React, { useMemo } from 'react'
import Item from './item'
const List = ({languages}) => {

    const elements = useMemo(() => {
        let items = []
        for(let i = 0; i < languages.length; i++) {
            items.push(<Item language={languages[i]}></Item>)
        }  
        return items   
    }, [languages])

    return (
        <div className="listing">
            <div>
            {
                elements
            }
            </div>
        </div>

    )
}

export default List;