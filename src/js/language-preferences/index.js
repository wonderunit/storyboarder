import React, { useRef, useMemo, useEffect, useState } from 'react'
import electron, { ipcRenderer } from 'electron'
const remote = require('@electron/remote')
import { Math } from 'three'
const {dialog} = remote
import ItemList from './ItemList'
import fs, { readFileSync } from 'fs-extra'
import path from 'path'
import JSONEditor from './JsonEditor/JsonEditor';
import Modal from '../shot-generator/components/Modal'
import {settings} from '../services/language.config'
const electronApp = electron.app ? electron.app : remote.app
const userDataPath = electronApp.getPath('userData')
const LanguagePreferences = React.memo(() => {
    const [selectedJson, selectJson] = useState({})
    const builtInLanguages = useRef(settings.getSettingByKey('builtInLanguages'))
    const [languages, setLanguages] = useState(builtInLanguages.current.concat(settings.getSettingByKey('customLanguages')))

    const [currentLanguage, setCurrentLanguage] = useState(settings.getSettingByKey('selectedLanguage'))
    const [isShowAddModal, showAddModal] = useState(false)
    const [isShowWarningModal, showWarningModal] = useState(false)
    const isBuiltInLanguage = (lng) => builtInLanguages.current.some((item) => item.fileName === lng)
    const [isEditable, setEditable] = useState(!isBuiltInLanguage(currentLanguage))
    const generateLanguageName = useRef()
    const newLanguageName = useRef()
    const warningText = useRef()
    const getFilepath = () => {
        if(isBuiltInLanguage(currentLanguage)) {
            return path.join(window.__dirname, 'js', 'locales', `${currentLanguage}.json`)
        } else {
            return path.join(userDataPath, 'locales', `${currentLanguage}.json`)
        }
    }

    const getLanguageIndex = (language) => {
        let element = languages.filter((lng) => lng.fileName === language)[0]
        return languages.indexOf(element)
    }

    useEffect(() => {
        let data = readFileSync(getFilepath())
        let json = JSON.parse(data)

        json["Name"] = languages[getLanguageIndex(currentLanguage)].displayName

        selectJson(json)
    }, [currentLanguage])

    const onJsonChange = (value) => {
        let lng = languages[getLanguageIndex(currentLanguage)]

        if(lng.displayName !== value.Name) {
            let customLanguages = settings.getSettingByKey('customLanguages')
            let element = customLanguages.filter((lng) => lng.fileName === currentLanguage)[0]
            let indexOf = customLanguages.indexOf(element)
            customLanguages[indexOf] = { fileName: currentLanguage, displayName: value.Name}
            settings.setSettingByKey('customLanguages', customLanguages)
            setLanguages(builtInLanguages.current.concat(customLanguages))
        }
     
        let json = JSON.stringify(value)
        fs.writeFileSync(getFilepath(), json)
        ipcRenderer.send("languageModified", currentLanguage)
    }

    const generateNewLanguageName = () => {
        let isUniqueName = false
        let language = languages.find((lng) => lng.fileName === currentLanguage).displayName
        let newLng = language + " copy"
        let iteration = 1
        while(!isUniqueName) {
            if(!languages.some((lng) => lng.displayName === newLng)) {
                isUniqueName = true
            } else {
                newLng = language + ` copy${iteration}`
                iteration++
            }
        }
        newLanguageName.current = generateLanguageName.current = newLng
    }

    const checkIfEditable = (lng) => {
        if(isBuiltInLanguage(lng)) {
            setEditable(false)
        } else {
            setEditable(true)
        }
    }

    const addNewLanguage = (lng) => {
        const localesPath = path.join(userDataPath, 'locales')
        fs.ensureDirSync(localesPath)
        let language = Math.generateUUID() + `_${lng}`
        const filePath = path.join(localesPath, `${language}.json`)
        let json = JSON.stringify(selectedJson)
        fs.writeFileSync(filePath, json)
        setCurrentLanguage(language)
        let customLanguages = settings.getSettingByKey('customLanguages')
        customLanguages.push({ fileName:language, displayName: lng })
        settings.setSettings({selectedLanguage: language, customLanguages})
        setLanguages(builtInLanguages.current.concat(customLanguages))
        checkIfEditable(lng)
        ipcRenderer.send("languageAdded", language)
    }

    const removeSelectedLanguage = () => {
        if(isBuiltInLanguage(currentLanguage)) {
            warningText.current = "You cannot remove built-in language"
        } else {
            warningText.current = `Are you sure you want to remove ${removeUUIDFromName(currentLanguage)}`
        }
        showWarningModal(true)
    } 

    const removeUUIDFromName = (name) => {
        let splits = selectedJson.Name.split('_')
        let fileName 
        if(splits.length === 1) {
            fileName = splits[0]
        } else {
            fileName = splits[1]
            for(let i = 2; i < splits.length; i++) {
                fileName = "_" + splits[i]
            }
        }
        return fileName
    } 

    const proceedWithRemoval = () => {
        let newLanguage = languages[0]
        let customLanguages = settings.getSettingByKey('customLanguages')
        fs.removeSync(path.join(userDataPath, 'locales', `${currentLanguage}.json`))
        let element = customLanguages.filter((lng) => lng.fileName === currentLanguage)[0]
        let indexOf = customLanguages.indexOf(element)
        customLanguages.splice(indexOf, 1)
        settings.setSettings({selectedLanguage: newLanguage.fileName, customLanguages})
        setLanguages(builtInLanguages.current.concat(customLanguages))
        setCurrentLanguage(newLanguage.fileName)
        checkIfEditable(newLanguage.fileName)
        ipcRenderer.send("languageRemoved", newLanguage.fileName)
    }

    const selectLanguage = (lng) => {
        checkIfEditable(lng)
        settings.setSettings({selectedLanguage: lng})
        setCurrentLanguage(lng)
        ipcRenderer.send("languageChanged", lng)
    } 

    const exportLanguage = async () => {
        let filePath = await dialog.showOpenDialog({
            properties: ['openDirectory'],
            buttonLabel: 'Export'
        })
        if(filePath.canceled) return
        let json = JSON.stringify(selectedJson)

        let fileName = removeUUIDFromName(selectJson.Name)

        let savePath = path.join(filePath.filePaths[0], fileName + '.json')
        if(fs.existsSync(savePath)) {
            savePath = path.join(filePath.filePaths[0], fileName + ' new.json')
        }
        fs.writeFileSync(savePath, json)
    }

    const importLanguage = async () => {
        let filePath = await dialog.showOpenDialog({
            properties: ['openFile'],
            filters: [
                { name: 'Json', extensions: ['json'] },
            ]
        })
        if(filePath.canceled) return
        let file = filePath.filePaths[0]
        let data = await fs.readFile(path.join(file))
        let json = JSON.parse(data)
        let displayName = json.Name
        if(!json.Name) {
            displayName = 'NewLanguage'
            json.Name = displayName
        }
        const localesPath = path.join(userDataPath, 'locales')
        fs.ensureDirSync(localesPath)
        let { name } = path.parse(file)
        name = Math.generateUUID() + `_${name}` 
        const userDataFilePath = path.join(localesPath, `${name}.json`)
        let newJson = JSON.stringify(json)
        fs.writeFileSync(userDataFilePath, newJson)

        let customLanguages = settings.getSettingByKey('customLanguages')
        customLanguages.push({ fileName:name, displayName: displayName })
        settings.setSettings({selectedLanguage: name, customLanguages})
        setLanguages(builtInLanguages.current.concat(customLanguages))
        ipcRenderer.send("languageAdded", name)
        setCurrentLanguage(name)
    }
    return (
        <div className="languages-container">
            {
                isShowWarningModal && 
                <Modal visible={ isShowWarningModal } onClose={() => showWarningModal(false)}>
                    <div style={{ margin: "5px 5px 5px 5px" }}>
                        {warningText.current}
                    </div>
                    {
                        isBuiltInLanguage(currentLanguage) ? 
                        <div className="modal-selector__div">
                            <button
                                className="modal-selector__button"
                                onClick={() => {
                                    showWarningModal(false)
                                }}>
                                    Proceed
                            </button>
                        </div>
                        :
                        <div className="modal-row">

                        <div className="modal-selector__div">
                            <button
                                className="modal-selector__button"
                                onClick={() => {
                                    showWarningModal(false)
                                }}>
                                    Cancel
                            </button>
                        </div>
                          <div className="modal-selector__div">
                          <button
                              className="modal-selector__button"
                              onClick={() => {
                                  showWarningModal(false)
                                  proceedWithRemoval()
                              }}>
                                  Continue
                          </button>
                            </div>
                        </div>
                    }
       
                </Modal>
            }
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
                    <div className="modal-selector__div">
                        <button
                            className="modal-selector__button"
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
                <h1 className="config-title">Language Editor</h1>
                <div id="config-intro" style={{paddingBottom: "20px"}}>Your friendly language editor. Copy, Remove, Import or Export and share with others.</div>
                <ItemList 
                    languages={languages.map(l => ({ ...l, editable: !isBuiltInLanguage(l.fileName) }))} 
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

                <div id="button-content">
                    <div className="button-io " onClick={ importLanguage }>
                        Import
                    </div>
                    <div className="button-io " onClick={ exportLanguage }>
                        Export 
                    </div>
                </div>
            </div>
            <div className="language-editor">
                { !isEditable && 
                <div className="editor-warning">
                    <div className="editor-warning-text">
                        This is an installed language. It cannot be edited directly. <br/>
                        Make a copy of it to start a new language.
                    </div>
                </div>  }
               <JSONEditor
                json={selectedJson}
                onChange={onJsonChange}
                />         
            </div>
        </div>
    )
})

export default LanguagePreferences