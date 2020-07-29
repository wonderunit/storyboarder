import React, { useMemo, useEffect, useState } from 'react'
import { ipcRenderer } from 'electron'
import {updateHello} from './store'
import { connect } from 'react-redux'
import ItemList from './ItemList'
import fs from 'fs-extra'
import path from 'path'
import JSONEditor from './JsonEditor/JsonEditor';

const LanguagePreferences = React.memo(({}) => {
    const [selectedJson, selectJson] = useState({})
    const [currentLanguage, setCurrentLanguage] = useState("test")
    useEffect(() => {
        let json = JSON.parse(fs.readFileSync(path.join(window.__dirname,  `js/locales/${currentLanguage}.json`)))
        selectJson(json)
    }, [])

    const onJsonChange = (value) => {
        let json = JSON.stringify(value)
        fs.writeFileSync(path.join(window.__dirname,  `js/locales/${currentLanguage}.json`), json)
        ipcRenderer.send("languageModified", currentLanguage)
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
               <JSONEditor
                json={selectedJson}
                onChange={onJsonChange}
                />         
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