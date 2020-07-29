import React, { useMemo } from 'react'
import {updateHello} from './store'
import { connect } from 'react-redux'
import ItemList from './ItemList'
const LanguagePreferences = React.memo(({hello, updateHello}) => {
    useMemo(() => {
        console.log(hello)
    }, [hello])

    const updateValue = (event) => {
        console.log(event.target.value)
        updateHello(event.target.value)
    }
    return (
        <div className="languages-container">
            <div className="languages-config">
                <ItemList/>
                <div className="modify-buttons-container">
                    <div className="button">
                        <a>+</a>
                    </div>
                    <div className="button">
                        <a>-</a>
                    </div>
                </div>
            </div>
            <div className="language-editor">
                <input type="text" value={hello} onChange={updateValue}></input>          
            </div>
        </div>
    )
})

export default connect(
    (state)=> ({
    hello: state.hello
    }), 
    {
        updateHello
    }
)(LanguagePreferences)