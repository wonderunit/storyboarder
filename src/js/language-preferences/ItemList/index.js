import React, { useMemo } from 'react'
import { supportedLanguages } from '../../services/language.config'
import Item from './item'
const List = () => {

    const elements = useMemo(() => {
        let items = []
        for(let i = 0; i < supportedLanguages.length; i++) {
            items.push(<Item language={supportedLanguages[i]}></Item>)
        }  
        return items   
    }, [])

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