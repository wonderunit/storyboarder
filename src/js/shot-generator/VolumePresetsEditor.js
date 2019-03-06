const React = require('react')
const { useState, useEffect, useRef, useContext } = React
const { connect } = require('react-redux')
const presetsStorage = require('../shared/store/presetsStorage')
const THREE = require('three')
const h = require('../utils/h')
const prompt = require('electron-prompt')
const { dialog } = require('electron').remote


window.THREE = window.THREE || THREE

const { updateObject } = require('../shared/reducers/shot-generator')

const saveVolumePreset = state => presetsStorage.saveVolumePresets({ volumes: state.presets.volumes })

const shortId = id => id.toString().substr(0, 7).toLowerCase()

const VolumePresetsEditor = connect(
    state => ({
        volumePresets: state.presets.volumes,
    }),
    {
        updateObject,
        selectVolumePreset: (id, name) => (dispatch, getState) => {
            dispatch(updateObject(id, {
                effect: name        
            }))
        },
        createVolumePreset: ({ id, name, sceneObject }) => (dispatch, getState) => {
            let preset = {
                id,
                name,
                state: {

                }
            }
            dispatch(createVolumePreset(preset))

            saveVolumePreset(setState())

            dispatch(updateObject(sceneObject.id, {volumePresetId: id}))

        }
    }
)(
    React.memo(({ sceneObject, volumePresets, selectVolumePreset, createVolumePreset }) => {
        const onCreateVolumeClick = event => {
            let id = THREE.Math.generateUUID()
            prompt({
                title: 'Volume Name',
                label: 'Select a Volume Name',
                value: `Pose ${shortId(id)}`
            }, require('electron').remote.getCurrentWindow()).then(name => {
                if (name != null && name != '' && name != ' ') {

                    let filepaths = dialog.showOpenDialog(null, { properties: ['openFile', 'multiSelections'] })
                    if (filepaths) {
                        console.log('got filepaths: ', filepaths)
                    }

                    createVolumePreset({
                        id,
                        name, 
                        sceneObject
                    })
                }
            }).catch(err => {
                console.log(err)
            })
        }

        const onSelectVolumePreset = event => {
            let volumePresetId = event.target.value
            let preset = volumePresets[volumePresetId]
            selectVolumePreset(sceneObject.id, volumePresetId, preset)
        }
               
        return h(
            ['div.row', { style: { margin: '9px 0 6px 0', paddingRight: 0 } }, [
                ['div', { style: { width: 60, display: 'flex', alignSelf: 'center' } }, 'volume'],
                [
                    'select', {
                        value: sceneObject.effect || '',
                        onChange: event => {
                            event.preventDefault()
                            let selected = event.target.selectedOptions[0]
                            if (selected)
                                if (selected.dataset.selector) {
                                    // implement here
                                } else {
                                    console.log('updating: ', sceneObject.id, ' with ', event.target.value)
                                    selectVolumePreset(sceneObject.id, event.target.value)
                                    //updateObject(sceneObject.id, {effect: event.target.value })
                                }
                            },
                        style: {
                            flex: 1,
                            marginBottom: 0,
                        }
                    }, [
                        Object.keys(volumePresets).map(key => 
                            ['option', { value: key }, key]
                            ),
                        ['option', { value: '', disabled: true }, '---'],
                    ]
                ]
            ],
            ['a.button_add[href=#]', { style: { marginLeft: 6 }, onClick: event => { 
                event.preventDefault()
                onCreateVolumeClick() 
            }}, '+']
        ]
        )
    })
)

module.exports = VolumePresetsEditor