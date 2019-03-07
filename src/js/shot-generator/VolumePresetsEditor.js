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

const replaceAllBackSlash = (targetStr) => {
  var index=targetStr.indexOf("\\")
  while(index >= 0){
      targetStr=targetStr.replace("\\","/")
      index=targetStr.indexOf("\\")
  }
  return targetStr
}

const VolumePresetsEditor = connect(
  state => ({
    volumePresets: state.presets.volumes,
  }),
  {
    updateObject,
    selectVolumePreset: (id, volumeId) => (dispatch, getState) => {
      dispatch(updateObject(id, {
        volumePresetId: volumeId
      }))
    },
    createVolumePreset: ({ id, name, images, sceneObject, volumePresets }) => (dispatch, getState) => {
      
      let preset = {
        id,
        name,
        images: images
      }
      dispatch(createVolumePreset(preset))

      saveVolumePreset(getState())

      dispatch(updateObject( sceneObject.id, { volumePresetId: id }))

    }
  }
)(
  React.memo(({ sceneObject, volumePresets, selectVolumePreset, createVolumePreset }) => {
    const onCreateVolumeClick = event => {
      let id = THREE.Math.generateUUID()
      let filepaths = dialog.showOpenDialog(null, { properties: ['openFile', 'multiSelections'] })
      if (filepaths) {
        filepaths.sort()
        let name = replaceAllBackSlash(filepaths[0]).match(/([^\/]*)\/*$/)[1].replace(/\.[^/.]+$/, "").replace(/[0-9]/g, '')
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
            value: volumePresets[sceneObject.volumePresetId].id || '',
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
