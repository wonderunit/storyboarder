import React, { useRef, useMemo, useEffect, useState } from 'react'
import Electron, { ipcRenderer } from 'electron'
import {updateHello} from './store'
import { connect } from 'react-redux'
import ItemList from './ItemList'
import fs, { readFileSync } from 'fs-extra'
import path from 'path'
import JSONEditor from './JsonEditor/JsonEditor';
import Modal from '../shot-generator/components/Modal'
import {settings} from '../services/language.config'
const electronApp = Electron.app ? Electron.app : Electron.remote.app
const userDataPath = electronApp.getPath('userData')
const LanguagePreferences = React.memo(({}) => {
    const [selectedJson, selectJson] = useState({})
    const [languages, setLanguages] = useState(settings.getSettingByKey('languages'))
    const [currentLanguage, setCurrentLanguage] = useState(settings.getSettingByKey('selectedLanguage'))
    const [isShowAddModal, showAddModal] = useState(false)
    const generateLanguageName = useRef()
    const newLanguageName = useRef()

    const getFilepath = () => {
        let projectPath = path.join(window.__dirname, `js/locales/${currentLanguage}.json`)
        if(fs.existsSync(projectPath)) {
            return projectPath
        } else {
            return path.join(userDataPath, `locales/${currentLanguage}.json`)
        }
    }

    useEffect(() => {
        let data = readFileSync(getFilepath())
        let json = JSON.parse(data)
        selectJson(json)
    }, [currentLanguage])

    const onJsonChange = (value) => {
        let json = JSON.stringify(value)
        fs.writeFileSync(getFilepath(), json)
        ipcRenderer.send("languageModified", currentLanguage)
    }

    const generateNewLanguageName = () => {
        let isUniqueName = false
        let newLng = currentLanguage + " copy"
        let iteration = 1
        while(!isUniqueName) {
            if(!languages.includes(newLng)) {
                isUniqueName = true
            } else {
                newLng = currentLanguage + ` copy${iteration}`
                iteration++
            }
        }
        newLanguageName.current = generateLanguageName.current = newLng
    }

    const addNewLanguage = (lng) => {
        const localesPath = path.join(userDataPath, 'locales')
        fs.ensureDirSync(localesPath)
        const filePath = path.join(localesPath, `${lng}.json`)
        let json = JSON.stringify(selectedJson)
        fs.writeFileSync(filePath, json)
        ipcRenderer.send("languageAdded", lng)
        setCurrentLanguage(lng)
        let languages = settings.getSettingByKey('languages')
        languages.push(lng)
        settings.setSettings({selectedLanguage: lng, languages})
        setLanguages([...languages])
    }

    const removeSelectedLanguage = () => {
        let projectPath = path.join(userDataPath, `locales/${currentLanguage}.json`)
        if(!fs.existsSync(projectPath)) return
        let languages = settings.getSettingByKey('languages')
        let newLanguage = languages[0]
        fs.removeSync(projectPath)
        ipcRenderer.send("languageRemoved", newLanguage)
        let indexOf = languages.indexOf(currentLanguage)
        languages.splice(indexOf, 1)
        settings.setSettings({selectedLanguage: newLanguage, languages})
        setLanguages([...languages])
        setCurrentLanguage(newLanguage)
    } 

    const selectLanguage = (lng) => {
        settings.setSettings({selectedLanguage: lng})
        setCurrentLanguage(lng)
        ipcRenderer.send("languageChanged", lng)
    } 
    return (
        <div className="languages-container">
            {
                isShowAddModal && 
                <Modal visible={ isShowAddModal } onClose={() => showAddModal(false)}>
                    <div style={{ margin: "5px 5px 5px 5px" }}>
                        Set language label:
                    </div>
                    <div className="column" style={{ flex: 1 }}> 
                        <input 
                            className="modalInput"
                            type="text" 
                            placeholder={ generateLanguageName.current }
                            onChange={ (value) => newLanguageName.current = value.currentTarget.value }/>
                    </div>
                    <div className="skeleton-selector__div">
                        <button
                            className="skeleton-selector__button"
                            onClick={() => {
                                showAddModal(false)
                                addNewLanguage(newLanguageName.current)
                            }}>
                                Proceed
                        </button>
                    </div>
                </Modal>
            }
            <div className="languages-config">
                <ItemList 
                    languages={languages} 
                    onSelect={selectLanguage}
                    selectedLanguage={currentLanguage} />
                <div className="modify-buttons-container">
                    <div className="button" onClick={()=> { generateNewLanguageName(); showAddModal(true) }}>
                        +
                    </div>
                    <div className="button" onClick={() => { removeSelectedLanguage() }}>
                        -
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