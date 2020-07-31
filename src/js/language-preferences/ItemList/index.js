import React, { useMemo, useEffect } from 'react'
import Item from './item'
import Grid from '../../shot-generator/components/Grid'
import Scrollable from '../../shot-generator/components/Scrollable'
const List = ({languages, onSelect, selectedLanguage}) => {

    const createElements = () => {
        let elements = []
        for(let i = 0; i < languages.length; i++) {
            elements.push(<Item key={i} language={languages[i]} onClick={onSelect} selectedLanguage={selectedLanguage} />)
        }
        return elements
    }
    return (
        <div className="listing">
            <Scrollable>
                {
                    createElements()
                }
            </Scrollable>
        </div>
    )
}

export default List;