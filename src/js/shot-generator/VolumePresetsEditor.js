const React = require('react')
const { useState, useEffect, useRef, useContext } = React
const { connect } = require('react-redux')
const presetsStorage = require('../shared/store/presetsStorage')
const THREE = require('three')
const h = require('../utils/h')
const prompt = require('electron-prompt')
const { dialog } = require('electron').remote


window.THREE = window.THREE || THREE

const { updateObject, createVolumePreset } = require('../shared/reducers/shot-generator')

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
    createVolumePreset: ({ id, name, images, sceneObject, volumePresets }) => (dispatch, getState) => {
      
      let preset = {
        id,
        name,
        images: images
      }
      console.log('volume presets: ', volumePresets)
      dispatch(createVolumePreset(preset))

      saveVolumePreset(getState())

      //selectVolumePreset(updateObject( sceneObject.id, { effect: name }))
      dispatch(updateObject( sceneObject.id, { effect: id }))

    }
  }
)(
  React.memo(({ sceneObject, volumePresets, selectVolumePreset, createVolumePreset }) => {
    const onCreateVolumeClick = event => {
      let id = THREE.Math.generateUUID()
      console.log('id: ', id)
      let filepaths = dialog.showOpenDialog(null, { properties: ['openFile', 'multiSelections'] })
      if (filepaths) {
        filepaths.sort()
        let name = filepaths[0].match(/([^\/]*)\/*$/)[1].replace(/\.[^/.]+$/, "").replace(/[0-9]/g, '')
        createVolumePreset({
          id,
          name,
          images: filepaths,
          sceneObject,
          volumePresets
        })
      }          
    }

    return h(
      ['div.row', { style: { margin: '9px 0 6px 0', paddingRight: 0 } }, [
        ['div', { style: { width: 60, display: 'flex', alignSelf: 'center' } }, 'volume'],
        [
          'select', {
            value: volumePresets[sceneObject.effect].id || '',
            onChange: event => {
              event.preventDefault()
              let selected = event.target.selectedOptions[0]
              if (selected)
                if (selected.dataset.selector) {
                } else {
                  selectVolumePreset(sceneObject.id, event.target.value)
                }
            },
            style: {
              flex: 1,
              marginBottom: 0,
            }
          }, [
           
            Object.values(volumePresets).map( effect => 
              ['option', {value: effect.id}, effect.name])
          ]
        ]
      ],
        ['a.button_add[href=#]', {
          style: { marginLeft: 6 }, onClick: event => {
            event.preventDefault()
            onCreateVolumeClick()
          }
        }, '+']
      ]
    )
  })
)

module.exports = VolumePresetsEditor
