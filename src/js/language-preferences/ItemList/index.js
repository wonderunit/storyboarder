import React, { useMemo, useEffect } from 'react'
import Item from './item'
import Grid from '../../shot-generator/components/Grid'
import Scrollable from '../../shot-generator/components/Scrollable'
const NUM_COLS = 4
const ITEM_HEIGHT = 70
const List = ({languages, onSelect, selectedLanguage}) => {
/* 
    const elements = useMemo(() => {
        let items = []
        for(let i = 0; i < languages.length; i++) {
            items.push(<Item key={i} language={languages[i]} selectedLanguage={selectedLanguage} onClick={() => onSelect(languages[i])}></Item>)
        }  
        return items   
    }, [languages]) */

    return (
        <div className="listing">
            <Scrollable>
                <Grid
                   itemData={{
                        selectedLanguage: selectedLanguage,
                        onClick: onSelect
                   }}
                   Component={Item}
                   elements={languages}
                   numCols={NUM_COLS}
                   itemHeight={ITEM_HEIGHT}
                />
            </Scrollable>
        </div>
    )
}

export default List;