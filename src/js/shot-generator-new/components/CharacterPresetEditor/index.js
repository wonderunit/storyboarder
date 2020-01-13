import React, { useState, useRef, useCallback } from 'react'
import { connect } from 'react-redux'
import {
    updateObject,

    createCharacterPreset,
    getSceneObjects,

    undoGroupStart,
    undoGroupEnd,
  } from '../../../shared/reducers/shot-generator'
import presetsStorage from '../../../shared/store/presetsStorage'
import Modal from '../Modal'

const preventDefault = (fn, ...args) => e => {
    e.preventDefault()
    fn(e, ...args)
  }
const saveCharacterPresets = state => presetsStorage.saveCharacterPresets({ characters: state.presets.characters })
const shortId = id => id.toString().substr(0, 7).toLowerCase()

const CharacterPresetsEditor = connect(
  state => ({
    characterPresets: state.presets.characters,
    models: state.models
  }),
  {
    updateObject,
    selectCharacterPreset: (sceneObject, characterPresetId, preset) => (dispatch, getState) => {
      dispatch(updateObject(sceneObject.id, {
        characterPresetId,
        height: preset.state.height,
        model: preset.state.model,
        headScale: preset.state.headScale,
        tintColor: preset.state.tintColor,
        morphTargets: {
          mesomorphic: preset.state.morphTargets.mesomorphic,
          ectomorphic: preset.state.morphTargets.ectomorphic,
          endomorphic: preset.state.morphTargets.endomorphic
        },
        name: sceneObject.name || preset.name
      }))
    },
    createCharacterPreset: ({ id, name, sceneObject }) => (dispatch, getState) => {
      // add the character data to a named preset
      let preset = {
        id,
        name,
        state: {
          height: sceneObject.height,
          model: sceneObject.model,
          headScale: sceneObject.headScale,
          tintColor: sceneObject.tintColor,
          morphTargets: {
            mesomorphic: sceneObject.morphTargets.mesomorphic,
            ectomorphic: sceneObject.morphTargets.ectomorphic,
            endomorphic: sceneObject.morphTargets.endomorphic
          }
        }
      }

      // start the undo-able operation
      dispatch(undoGroupStart())

      // create the preset
      dispatch(createCharacterPreset(preset))

      // save the presets file
      saveCharacterPresets(getState())

      // update this object to use the preset
      dispatch(updateObject(sceneObject.id, {
        // set the preset id
        characterPresetId: id,
        // use the preset’s name (if none assigned)
        name: sceneObject.name || preset.name
      }))

      // end the undo-able operation
      dispatch(undoGroupEnd())
    },
    withState: (fn) => (dispatch, getState) => fn(dispatch, getState()),
  }
)(
  React.memo(({ 
    id, 
    characterPresetId,
    characterPresets,
    selectCharacterPreset, 
    createCharacterPreset, 
    withState
   }) => {
    const [isModalShown, showModal] = useState(false)
    const newPresetName = useRef('')
    const newGeneratedId = useRef()

    const getSceneObject = useCallback(() => {
      let sceneObject = null
      withState((dispatch, state) => {
        sceneObject = getSceneObjects(state)[id]
      })
      return sceneObject
    }, [id])

    const addNewCharacterPreset = useCallback((name) => {
      let id = THREE.Math.generateUUID()
      createCharacterPreset({
        id,
        name,
        sceneObject:getSceneObject()
      })
    }, [getSceneObject()])

    const onCreateCharacterPresetClick = () => {
      newGeneratedId.current = "Character " + shortId(THREE.Math.generateUUID())
      newPresetName.current = newGeneratedId.current
      showModal(true)
    }

    const onSelectCharacterPreset = event => {
      let characterPresetId = event.target.value
      let preset = characterPresets[characterPresetId]
      selectCharacterPreset(getSceneObject(), characterPresetId, preset)
    }

    return <div>
      <Modal visible={ isModalShown } onClose={ () => showModal(false) }>
        <div style={{ margin: "5px 5px 5px 5px" }}>
          Select a Preset Name:
        </div>
        <div className="column" style={{ flex: 1 }}> 
          <input 
            className="modalInput"
            type="text" 
            placeholder={ newGeneratedId.current }
            onChange={ (value) => newPresetName.current = value.currentTarget.value }/>
        </div>
        <div className="skeleton-selector__div">
          <button
            className="skeleton-selector__button"
            onClick={() => {
              showModal(false)
              addNewCharacterPreset(newPresetName.current)
            }}>
              Proceed
          </button>
          </div>
      </Modal>
      <div className="row" style={{ margin: "9px 0 6px 0", paddingRight: 0 }}>
          <div style={{ width: 50, display: "flex", alignSelf: "center" }}>preset</div>
          <select required={ true }
            value={ characterPresetId || "" }
            onChange={ preventDefault(onSelectCharacterPreset) }
            style={{ flex: 1,
                  marginBottom: 0,
                  maxWidth: 192 }}>
              <option value="" disabled={ true }>---</option>
              { Object.values(characterPresets).map((preset, index) =>
                <option key={ index } value={ preset.id }>{ preset.name }</option>
              )}
          </select>
          <a className="button_add" href="#" style={{ marginLeft: 6 }} onPointerUp={ preventDefault(onCreateCharacterPresetClick) }>+</a> 
        </div>
      </div>
  })
)
export default CharacterPresetsEditor
