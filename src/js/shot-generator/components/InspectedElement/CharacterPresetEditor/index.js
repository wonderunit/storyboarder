import * as THREE from 'three'
import React, { useState, useRef, useCallback } from 'react'
import { connect, batch } from 'react-redux'
import {
  updateObject,

  createCharacterPreset,
  createObjects,
  getSceneObjects,

  undoGroupStart,
  deleteObjects,
  undoGroupEnd, getSelections,
  getDefaultPosePreset
} from '../../../../shared/reducers/shot-generator'
import presetsStorage from '../../../../shared/store/presetsStorage'
import Modal from '../../Modal'
import deepEqualSelector from '../../../../utils/deepEqualSelector'
import { useTranslation } from 'react-i18next'
const preventDefault = (fn, ...args) => e => {
    e.preventDefault()
    fn(e, ...args)
  }
const saveCharacterPresets = state => presetsStorage.saveCharacterPresets({ characters: state.presets.characters })
const shortId = id => id.toString().substr(0, 7).toLowerCase()

const getPresetId = deepEqualSelector([getSelections, getSceneObjects], (selections, sceneObjects) => {
  return sceneObjects[selections[0]].characterPresetId
})

const CharacterPresetsEditor = connect(
  state => ({
    characterPresets: state.presets.characters,
    models: state.models,
    id: getSelections(state)[0],
    characterPresetId: getPresetId(state)
  }),
  {
    updateObject,
    selectCharacterPreset: (sceneObject, characterPresetId, preset) => (dispatch, getState) => {
      let sceneObjects = getSceneObjects(getState())
      let attachableIds = Object.values(sceneObjects).filter(obj => obj.attachToId === sceneObject.id).map(obj => obj.id)
      let character = Object.values(sceneObjects).filter(obj => obj.id === sceneObject.id)[0]
      let defaultCharacterPreset = getDefaultPosePreset()
        dispatch(undoGroupStart())
        dispatch(deleteObjects(attachableIds))

        dispatch(updateObject(sceneObject.id, {
          characterPresetId,
          height: preset.state.height,
          model: preset.state.model,
          headScale: preset.state.headScale,
          tintColor: preset.state.tintColor,
          rotation: 0,
          morphTargets: {
            mesomorphic: preset.state.morphTargets.mesomorphic,
            ectomorphic: preset.state.morphTargets.ectomorphic,
            endomorphic: preset.state.morphTargets.endomorphic
          },
          name: sceneObject.name || preset.name,
          posePresetId: defaultCharacterPreset.id,
          skeleton: defaultCharacterPreset.state.skeleton
        }))
        setTimeout(() => {
          sceneObjects = getSceneObjects(getState())
          character = Object.values(sceneObjects).filter(obj => obj.id === sceneObject.id)[0]
          let attachables = initializeAttachables(character, preset)
          if(attachables)
          dispatch(createObjects(attachables))

          dispatch(undoGroupEnd())
        }, 200)

    },
    createCharacterPreset: ({ id, name, sceneObject, attachables }) => (dispatch, getState) => {
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
      let newAttachables = []
      for(let i = 0; i < attachables.length; i++) {
        let attachable = {
          bone: sceneObject.skeleton[attachables[i].bindBone],
          ...attachables[i]
          }
        newAttachables.push(attachable)
      }
      if(attachables.length) {
        preset.state.attachables = newAttachables
        preset.state.presetPosition = { x:sceneObject.x, y: sceneObject.y, z: sceneObject.z },
        preset.state.presetRotation = sceneObject.rotation
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
     const { t } = useTranslation()
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

    const getAttachables = useCallback(() => {
      let attachables = null
      withState((dispatch, state) => {
        attachables = Object.values(getSceneObjects(state)).filter(object => object.attachToId === id)
      })
      return attachables
    }, [id])

    const addNewCharacterPreset = useCallback((name) => {
      let id = THREE.Math.generateUUID()
      let attachables = getAttachables()
     
      createCharacterPreset({
        id,
        name,
        sceneObject:getSceneObject(),
        attachables
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
        {t("shot-generator.inspector.common.select-preset-name")}
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
              {t("shot-generator.inspector.common.add-preset")}
          </button>
          </div>
      </Modal>
      <div className="row" style={{ margin: "9px 0 6px 0", paddingRight: 0 }}>
          <div style={{ width: 50, display: "flex", alignSelf: "center" }}>{t("shot-generator.inspector.character-preset.preset")}</div>
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

const initializeAttachables = (sceneObject, preset) => {
  let attachables = preset.state.attachables
  if(attachables) {
    let newAttachables = []
    let currentParent = new THREE.Group()
    let currentBoneGroup  = new THREE.Group()
    currentParent.position.set(sceneObject.x, sceneObject.z, sceneObject.y)
    currentParent.rotation.set(0, sceneObject.rotation, 0 )
    currentParent.updateMatrixWorld(true)

    let prevParent = new THREE.Group()
    let prevBoneGroup = new THREE.Group()
    prevParent.position.set(preset.state.presetPosition.x, preset.state.presetPosition.z, preset.state.presetPosition.y)
    prevParent.rotation.set(0, preset.state.presetRotation, 0 )
    prevParent.updateMatrixWorld(true)

    // Init prev parent position
  
    let attachableObject = new THREE.Object3D()
    for(let i = 0; i < attachables.length; i++) {
      // Init prev parent position
      let attachable = attachables[i]
      // Init prev bone position
      let prevBone = attachable.bone
      prevBoneGroup.position.set(prevBone.position.x, prevBone.position.y, prevBone.position.z)
      prevBoneGroup.quaternion.set(prevBone.quaternion.x, prevBone.quaternion.y, prevBone.quaternion.z, prevBone.quaternion.w)
      prevParent.add(prevBoneGroup)
      prevBoneGroup.updateMatrixWorld(true)
      
      // Init current bone position
      let currentBone = sceneObject.skeleton[attachable.bindBone]
      currentBoneGroup.position.set(currentBone.position.x, currentBone.position.y, currentBone.position.z)
      currentBoneGroup.quaternion.set(currentBone.quaternion.x, currentBone.quaternion.y, currentBone.quaternion.z, currentBone.quaternion.w)
      currentParent.add(currentBoneGroup)
      currentBoneGroup.updateMatrixWorld(true)

      let newAttachable = {}
      newAttachable.attachToId = sceneObject.id
      newAttachable.id = THREE.Math.generateUUID()
      newAttachable.loaded = false
      newAttachable.model = attachable.model
      newAttachable.name = attachable.name
      newAttachable.type = attachable.type
      newAttachable.size = attachable.size
      newAttachable.type = "attachable"
      newAttachable.bindBone = attachable.bindBone

      attachableObject.position.set(attachable.x, attachable.y, attachable.z)
      attachableObject.rotation.set(attachable.rotation.x, attachable.rotation.y, attachable.rotation.z)
      prevBoneGroup.add(attachableObject)
      attachableObject.updateMatrixWorld(true)

      attachableObject.applyMatrix4(prevBoneGroup.getInverseMatrixWorld())
      attachableObject.applyMatrix4(currentBoneGroup.matrixWorld)

      let { x, y, z }  = attachableObject.position
      newAttachable.x = x 
      newAttachable.y = y
      newAttachable.z = z
      let quaternion = attachableObject.quaternion
      let euler = new THREE.Euler().setFromQuaternion(quaternion)
      newAttachable.rotation = { x: euler.x, y: euler.y, z: euler.z }
      newAttachables.push(newAttachable)
      prevParent.remove(prevBoneGroup)
      currentParent.remove(currentBoneGroup)
    }
    return newAttachables
  } else { 
    return false
  }
}

export default CharacterPresetsEditor
