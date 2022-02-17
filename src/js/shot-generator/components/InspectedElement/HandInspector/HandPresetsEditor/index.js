import React from 'react'
const  { useState, useEffect, useMemo, useRef, useCallback } = React
import { connect } from 'react-redux'
import * as THREE from 'three'
import { machineIdSync } from 'node-machine-id'
import pkg from '../../../../../../../package.json'
import request from 'request'
import { useTranslation } from 'react-i18next'
const remote = require('@electron/remote')

import {
  updateObject,
  createHandPosePreset,

  getSceneObjects, 
  getSelections,
  undoGroupStart,
  undoGroupEnd,
  deleteHandPosePreset
} from '../../../../../shared/reducers/shot-generator'
import defaultPosePresets from '../../../../../shared/reducers/shot-generator-presets/hand-poses.json'
import presetsStorage from '../../../../../shared/store/presetsStorage'

import {NUM_COLS, ITEM_HEIGHT, CHARACTER_MODEL} from '../../../../utils/InspectorElementsSettings'
import { comparePresetNames, comparePresetPriority } from '../../../../utils/searchPresetsForTerms'
import { filepathFor } from '../../../../utils/filepathFor'

import '../../../../../vendor/three/examples/js/utils/SkeletonUtils'

import deepEqualSelector from './../../../../../utils/deepEqualSelector'
import SearchList from '../../../SearchList'
import Modal from '../../../Modal'
import Select from '../../../Select'
import Scrollable from '../../../Scrollable'
import Grid from '../../../Grid'
import HandPresetsEditorItem from './HandPresetsEditorItem'
import {useAsset} from '../../../../hooks/use-assets-manager'

const shortId = id => id.toString().substr(0, 7).toLowerCase()

const getPresetId = deepEqualSelector([getSelections, getSceneObjects], (selections, sceneObjects) => {
  return sceneObjects[selections[0]].handPosePresetId
})

const savePresetHand = [
  {value:"LeftHand", label:"LeftHand"},
  {value:"RightHand", label:"RightHand"}
]

const selectedHandOptions = [
  {value:"LeftHand", label:"Left Hand"},
  {value:"RightHand", label:"Right Hand"},
  {value:"BothHands", label:"Both Hands"}
]

const HandPresetsEditor = connect(
  state => ({
    handPosePresets: state.presets.handPoses,
    id: getSelections(state)[0],
    handPosePresetId: getPresetId(state),
    characterPath: filepathFor(CHARACTER_MODEL)
  }),
  {
    updateObject,
    createHandPosePreset,
    undoGroupStart,
    undoGroupEnd,
    deleteHandPosePreset,
    withState: (fn) => (dispatch, getState) => fn(dispatch, getState())
  }
)(
React.memo(({
  id,
  handPosePresetId,
  handPosePresets,

  updateObject,
  createHandPosePreset,
  characterPath,
  deleteHandPosePreset,
  undoGroupStart,
  undoGroupEnd,
  withState
}) => {
  const { t } = useTranslation()
  const thumbnailRenderer = useRef()
  const sortedPresets = useRef([])
  const [results, setResult] = useState([])
  const [isModalShown, showModal] = useState(false)
  const newPresetName = useRef('')
  const newGeneratedId = useRef()
  const [selectedHand, setSelectedHand] = useState(selectedHandOptions[2].value)
  const [selectedModalHand, setSelectedModalHand] = useState(savePresetHand[0])
  const {asset: attachment} = useAsset(characterPath)
  const presets = useMemo(() => {
    if(!handPosePresets) return
    let sortedPoses = Object.values(handPosePresets).sort(comparePresetNames).sort(comparePresetPriority)
    sortedPresets.current = sortedPoses.map((preset, index) => {
      return {
        value: preset.name + "|" + preset.keywords,
        id: index
      }
    })
    setResult(sortedPoses)
    return sortedPoses
  }, [handPosePresets])

  useEffect(() => {
    savePresetHand[0].label = t("shot-generator.inspector.hand-preset.left-hand")
    savePresetHand[1].label = t("shot-generator.inspector.hand-preset.right-hand")
    selectedHandOptions[0].label = t("shot-generator.inspector.hand-preset.left-hand")
    selectedHandOptions[1].label = t("shot-generator.inspector.hand-preset.right-hand")
    selectedHandOptions[2].label = t("shot-generator.inspector.hand-preset.both-hands")
  }, [t])

  const onChangeHand = useCallback((event) => {
    setSelectedHand(event.value)
  }, [])

  const saveFilteredPresets = useCallback(filteredPreset => {
    let objects = [] 
    for(let i = 0; i < filteredPreset.length; i++) {
      objects.push(presets[filteredPreset[i].id])
    }
    setResult(objects)
  }, [presets])

  const onCreateHandPosePreset = event => {
    event.preventDefault()
    newGeneratedId.current = "Pose "+shortId(THREE.Math.generateUUID())
    newPresetName.current = newGeneratedId.current
    showModal(true)
  }

  const addNewPosePreset = (name, handName) => {
    if (name != null && name != '' && name != ' ') {
      let sceneObject = []
      withState((dispatch, state) => {
        // get the latest skeleton data
        sceneObject = getSceneObjects(state)[id]
      })
      let skeleton = sceneObject.skeleton
      let model = sceneObject.model
      let originalSkeleton = Object.values(skeleton)
      let handSkeleton = {}
      setSelectedHand(handName)
      for(let i = 0; i < originalSkeleton.length; i++) {
            let key = originalSkeleton[i].name
            if(key.includes(handName) && key !== handName) {
              let rot = originalSkeleton[i].rotation
              handSkeleton[key] = { rotation: { x: rot.x, y: rot.y, z: rot.z } }
            }
      }
      // create a preset out of it
      let newPreset = {
          id: THREE.Math.generateUUID(),
          name,
          keywords: name, // TODO keyword editing
          state: {
            handSkeleton: handSkeleton || {}
          },
          priority: 0
      }
      // add it to state
      createHandPosePreset(newPreset)
    
      // save to server
      // for pose harvesting (maybe abstract this later?)
      request.post('https://storyboarders.com/api/create_pose', {
          form: {
            name: name,
            json: JSON.stringify(skeleton),
            model_type: model,
            storyboarder_version: pkg.version,
            machine_id: machineIdSync()
          }
      })
    
      // select the preset in the list
      updateObject(id, { handPosePresetId: newPreset.id })
    
      // get updated state (with newly created pose preset)
      withState((dispatch, state) => {
          // ... and save it to the presets file
          let denylist = Object.keys(defaultPosePresets)
          let filteredPoses = Object.values(state.presets.handPoses)
            .filter(pose => denylist.includes(pose.id) === false)
            .reduce(
              (coll, pose) => {
                coll[pose.id] = pose
                return coll
              },
              {}
            )
          presetsStorage.saveHandPosePresets({ handPoses: filteredPoses })
      })
    }
  }

  const onRemoval = (data) => {
    const choice = remote.dialog.showMessageBoxSync({
      type: 'question',
      buttons: [t('shot-generator.inspector.common.yes'), t('shot-generator.inspector.common.no')],
      message: t('shot-generator.inspector.common.are-you-sure'),
      defaultId: 1
    })

    if (choice !== 0) return

    withState((dispatch, state) => {
      // ... and save it to the presets file
      let denylist = Object.keys(defaultPosePresets)
      denylist.push(data.id)
      let filteredPoses = Object.values(state.presets.handPoses)
        .filter(pose => denylist.includes(pose.id) === false)
        .reduce(
          (coll, pose) => {
            coll[pose.id] = pose
            return coll
          },
          {}
        )
      presetsStorage.saveHandPosePresets({ handPoses: filteredPoses })
    })
    deleteHandPosePreset(data.id)
  }

  return (
    <React.Fragment>
      <Modal visible={ isModalShown } onClose={() => showModal(false)}>
        <div style={{ margin:"5px 5px 5px 5px" }}>
        {t("shot-generator.inspector.common.select-preset-name")}
        </div>
        <div className="column" style={{ flex: 1 }}> 
          <input 
            className="modalInput"
            type="text" 
            placeholder={ newGeneratedId.current }
            onChange={ (value) => newPresetName.current = value.currentTarget.value }/>
        </div>
        <div style={{ margin:"5px 5px 5px 5px" }}>
        {t("shot-generator.inspector.hand-preset.select-saving-hand")}
        </div>
        <div className="select">
          <Select 
            label={t("shot-generator.inspector.hand-preset.hand")}
            value={ selectedModalHand }
            options={ savePresetHand }
            onSetValue={ (item) => setSelectedModalHand(item) }/>
        </div>
        <div className="skeleton-selector__div">
          <button
            className="skeleton-selector__button"
            onClick={() => {
              showModal(false)
              addNewPosePreset(newPresetName.current, selectedModalHand.value)
            }}>
              {t("shot-generator.inspector.common.add-preset")}
          </button>
        </div>
     </Modal>
    <div className="thumbnail-search column">
        <div className="row" style={{ padding: "6px 0" }}> 
          <SearchList label={t("shot-generator.inspector.hand-preset.search-hand-pose")} list={ sortedPresets.current } onSearch={ saveFilteredPresets }/>
          <div className="column" style={{ marginLeft: 5 }}> 
            <a className="button_add" href="#"
              style={{ width: 30, height: 34 }}
              onPointerDown={ onCreateHandPosePreset }
             >+</a>
          </div>
        </div> 
        <div className="row" style= {{ padding: "6px 0" }} >
          <Select
            label={t("shot-generator.inspector.hand-preset.select-hand")}
            value={selectedHandOptions.find(item => item.value === selectedHand)}
            options={selectedHandOptions}
            onSetValue={onChangeHand}
          />
        </div>
     
        <Scrollable>
          <Grid
            Component={HandPresetsEditorItem}
            itemData={{
              id: id,
              handPosePresetId,

              attachment,
              updateObject,

              thumbnailRenderer,
              withState,
              selectedHand,
              undoGroupStart,
              undoGroupEnd,
              onRemoval
            }}
            elements={results}
            numCols={NUM_COLS}
            itemHeight={ITEM_HEIGHT}
          />
        </Scrollable>
      </div>
    </React.Fragment>
  )
}))

export default HandPresetsEditor

