import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { connect } from 'react-redux'
import * as THREE from 'three'

import { machineIdSync } from 'node-machine-id'
import pkg from '../../../../../package.json'
import request from 'request'
import { FixedSizeGrid } from 'react-window'
import {
  updateObject,
  createPosePreset,
  getSceneObjects
} from '../../../shared/reducers/shot-generator'

import defaultPosePresets from '../../../shared/reducers/shot-generator-presets/poses.json'
import presetsStorage from '../../../shared/store/presetsStorage'

import { comparePresetNames, comparePresetPriority } from '../../utils/searchPresetsForTerms' 
import { NUM_COLS, GUTTER_SIZE, ITEM_WIDTH, ITEM_HEIGHT, CHARACTER_MODEL, innerElementType } from '../../utils/InspectorElementsSettings'
import ListItem from './ListItem'
import Modal from '../Modal'
import { filepathFor } from '../../utils/filepathFor'
import deepEqualSelector from './../../../utils/deepEqualSelector'
import SearchList from '../SearchList/index.js'
const shortId = id => id.toString().substr(0, 7).toLowerCase()

const getAttachmentM = deepEqualSelector([(state) => state.attachments], (attachments) => { 
    let filepath = filepathFor(CHARACTER_MODEL)
    return !attachments[filepath] ? undefined : attachments[filepath].status
})
const PosePresetsEditor = connect(
  state => ({
    attachmentStatus: getAttachmentM(state),
    posePresets: state.presets.poses,
  }),
  {
    updateObject,
    createPosePreset,
    withState: (fn) => (dispatch, getState) => fn(dispatch, getState())
  }
)(
React.memo(({
  id,

  posePresets,
  attachmentStatus,

  updateObject,
  createPosePreset,
  withState
}) => {
  const thumbnailRenderer = useRef()

  const sortedAttachament = useRef([])
  const getAttachment = () => {
    let attachment 
    withState((dispatch, state) => {
      let filepath = filepathFor(CHARACTER_MODEL)
      attachment = state.attachments[filepath].value
    })
   
    return attachment
  }
  
  const [attachment, setAttachment] = useState(getAttachment())

  const [ready, setReady] = useState(false)
  const [results, setResult] = useState([])
  const [isModalShown, showModal] = useState(false)
  const newPresetName = useRef('')
  const newGeneratedId = useRef()

  const presets = useMemo(() => {
    if(!posePresets) return
    let sortedPoses = Object.values(posePresets).sort(comparePresetNames).sort(comparePresetPriority)
    sortedAttachament.current = sortedPoses.map((preset, index) => {
      return {
        value: preset.name + "|" + preset.keywords,
        id: index
      }
    })
    setResult(sortedPoses)
    return sortedPoses
  }, [posePresets])

  const getPosePresetId = () => {
    let posePresetId
    withState((dispatch, state) => {
      posePresetId = getSceneObjects(state)[id].posePresetId
    })
    return posePresetId
  }

  useEffect(() => {
    if (ready) return
    if (attachmentStatus === "Success" && !attachment) {
      let attachment = getAttachment()
      setAttachment(attachment)
      setTimeout(() => {
        setReady(true)
      }, 100) // slight delay for snappier character selection via click
    }
  }, [attachmentStatus])

  const saveFilteredPresets = useCallback(filteredPreset => {
    let objects = []
    for(let i = 0; i < filteredPreset.length; i++) {
      objects.push(presets[filteredPreset[i].id])
    }
    setResult(objects)
  }, [presets])

  const onCreatePosePreset = event => {
    event.preventDefault()
    newGeneratedId.current = "Pose "+shortId(THREE.Math.generateUUID())
    newPresetName.current = newGeneratedId.current
    showModal(true)
  }

  const addNewPosePreset = (name) => {
    if (name != null && name != '' && name != ' ') {
      withState((dispatch, state) => {
        // get the latest skeleton data
        let sceneObject = getSceneObjects(state)[id]
        let skeleton = sceneObject.skeleton
        let model = sceneObject.model

        // create a preset out of it
        let newPreset = {
          id: THREE.Math.generateUUID(),
          name,
          keywords: name, // TODO keyword editing
          state: {
            skeleton: skeleton || {}
          },
          priority: 0
        }

        // add it to state
        createPosePreset(newPreset)

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
        updateObject(id, { posePresetId: newPreset.id })

        // get updated state (with newly created pose preset)
        withState((dispatch, state) => {
          // ... and save it to the presets file
          let denylist = Object.keys(defaultPosePresets)
          let filteredPoses = Object.values(state.presets.poses)
            .filter(pose => denylist.includes(pose.id) === false)
            .reduce(
              (coll, pose) => {
                coll[pose.id] = pose
                return coll
              },
              {}
            )
          presetsStorage.savePosePresets({ poses: filteredPoses })
        })
      })
    }
  }

  return presets && <div>
    <Modal visible={ isModalShown } onClose={() => showModal(false)}>
      <div style={{ margin:"5px 5px 5px 5px" }}>
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
            addNewPosePreset(newPresetName.current)
          }}>
            Proceed
        </button>
        </div>
   </Modal>
   <div className="thumbnail-search column">
      <div className="row" style={{ padding: "6px 0" } }> 
        <SearchList label="Search for a pose …" list={ sortedAttachament.current } onSearch={ saveFilteredPresets }/>
        <div className="column" style={{ marginLeft: 5 }}> 
          <a className="button_add" href="#"
            style={{ width: 30, height: 34 }}
            onPointerDown={ onCreatePosePreset }
          >+</a>
        </div>
      </div> 
      
      <div className="thumbnail-search__list">
       <FixedSizeGrid 
          columnCount={ NUM_COLS }
          columnWidth={ ITEM_WIDTH + GUTTER_SIZE }

          rowCount={ Math.ceil(presets.length / 4) }
          rowHeight={ ITEM_HEIGHT }
          width={ 288 }
          height={ 363 }
          innerElementType={ innerElementType }
          itemData={{
            presets:results,

            id: id,
            posePresetId: getPosePresetId(),

            attachment,
            updateObject,

            thumbnailRenderer
          }}
          children={ ListItem }/>
      </div>
    </div> 
    </div>
}))

export default PosePresetsEditor
