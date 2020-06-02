import React, { useMemo, useRef, useState, useEffect, useLayoutEffect } from 'react'
import classNames from 'classnames'
import {connect} from 'react-redux'
import {
    updateObject,
    getSelections,
    getSceneObjects,
    createEmotionPreset,
    deleteEmotionPreset
  } from '../../../../shared/reducers/shot-generator'
import fs from 'fs-extra'
import path from 'path'
import { useCallback } from 'react'
import FileInput from '../../FileInput'
import deepEqualSelector from '../../../../utils/deepEqualSelector'
import { truncateMiddle } from '../../../../utils'
import presetsStorage from '../../../../shared/store/presetsStorage'
import defaultEmotions from '../../../../shared/reducers/shot-generator-presets/emotions.json'
import { NUM_COLS, ITEM_HEIGHT, CHARACTER_MODEL } from '../../../utils/InspectorElementsSettings'
import EmotionInspectorItem from './EmotionInspectorItem'
import Grid from '../../Grid'
import Scrollable from '../../Scrollable';
import FaceMesh  from '../../Three/Helpers/FaceMesh'
import { filepathFor } from '../../../utils/filepathFor'
import { useAsset } from '../../../hooks/use-assets-manager'
import { comparePresetNames, comparePresetPriority } from '../../../utils/searchPresetsForTerms'
import SearchList from '../../SearchList/index.js'
import Modal from '../../Modal'
import isUserModel from '../../../helpers/isUserModel'
const shortId = id => id.toString().substr(0, 7).toLowerCase()

const loadImages = (files, baseDir) => {
    return new Promise((resolve, reject) => {
      let projectDir = path.dirname(baseDir)
      let assetsDir = path.join(projectDir, 'models', 'emotions')
      fs.ensureDirSync(assetsDir)
  
      let dsts = []
      for (let src of files) {
        let dst = path.join(assetsDir, path.basename(src))
        try {
          fs.copySync(src, dst)
          dsts.push(dst)
        } catch (err) {
          reject(src)
        }
      }
  
      let ids = dsts.map(filepath => path.relative(projectDir, filepath))
      
      resolve(ids)
    })
  }
const getModelData = deepEqualSelector([(state) => {
    const selectedId = getSelections(state)[0]
    const object = getSceneObjects(state)[selectedId]
  
    return {
      sceneObject: object,
      characterPath: filepathFor(CHARACTER_MODEL),
      emotions: state.presets.emotions,
      storyboarderFilePath: state.meta.storyboarderFilePath
    }
  }], data => data)
const EmotionsInspector = connect(
    getModelData,
    {
        updateObject,
        createEmotionPreset,
        deleteEmotionPreset,
        withState: (fn) => (dispatch, getState) => fn(dispatch, getState()),
    }
  )( React.memo(({
    sceneObject,
    updateObject,
    characterPath,
    createEmotionPreset,
    withState,
    emotions,
    storyboarderFilePath,
    deleteEmotionPreset
  }) => {
    const thumbnailRenderer = useRef()
    const textureLoader = useRef(new THREE.TextureLoader())
    const faceMesh = useRef(new FaceMesh())
    const [results, setResult] = useState( ) 
    const {asset: attachment} = useAsset(characterPath)
    const [isModalShown, showModal] = useState(false)
    const newPresetName = useRef('')
    const newGeneratedId = useRef()
    const filePath = useRef()

    useEffect(() => {
      setResult(Object.values(emotions))
    }, [emotions])
    
    const onSelectFile = filepath => {
        if (filepath.file) { 
          loadImages(filepath.files, storyboarderFilePath)
          .then((ids) => {

            addEmotionPreset(ids[0], newPresetName.current)
          })
        }
    }

    const onCreatePosePreset = filepath => {
      if(!filepath.file) return 
      newGeneratedId.current = "Emotion "+shortId(THREE.Math.generateUUID())
      newPresetName.current = newGeneratedId.current
      filePath.current = filepath
      showModal(true)
    }

    const presets = useMemo(() => {
      let sortedPoses = Object.values(emotions).sort(comparePresetNames).sort(comparePresetPriority).map((preset, index) => {
        return {
          ...preset,
          value: preset.name + "|" + preset.keywords,
          index: index
        }
      })
      setResult(sortedPoses)
      return sortedPoses
    }, [])

    const saveFilteredPresets = useCallback(filteredPreset => {
      let objects = []
      for(let i = 0; i < filteredPreset.length; i++) {
        objects.push(presets[filteredPreset[i].index])
      }
      setResult(objects)
    }, [presets])

    const addEmotionPreset = (filepath, name) => {
      if (name != null && name != '' && name != ' ') {
        // create a preset out of it
        let newPreset = {
            id: THREE.Math.generateUUID(),
            name,
            keywords: name, // TODO keyword editing
            filename: filepath,
        }

        // add it to state
        createEmotionPreset(newPreset)
        if(!isUserModel(sceneObject.model)) {
          // select the preset in the list
          updateObject(sceneObject.id, { emotion: filepath }) 
        }
      
        // get updated state (with newly created pose preset)
        withState((dispatch, state) => {
            // ... and save it to the presets file
            let denylist = Object.keys(defaultEmotions)
            let filteredPoses = Object.values(state.presets.emotions)
              .filter(pose => denylist.includes(pose.id) === false)
              .reduce(
                (coll, pose) => {
                  coll[pose.id] = pose
                  return coll
                },
                {}
              )
            presetsStorage.saveEmotionsPresets({ emotions: filteredPoses })
        })
      }
    }

    const selectValue = useCallback(() => {
        const ext = path.extname(sceneObject.emotion)
        const basenameWithoutExt = path.basename(sceneObject.emotion, ext)
        const displayName = truncateMiddle(basenameWithoutExt, 13)
        return displayName
    }, [sceneObject.emotion])

    const onSelectItem = (filepath) => {
      if(!isUserModel(sceneObject.model)) {
        // select the preset in the list
        updateObject(sceneObject.id, { emotion: filepath }) 
      }
    } 

    const onRemoval = (data) => {
      let sceneObjects 
      withState((dispatch, state) => {
        sceneObjects = Object.values(getSceneObjects(state)).filter(object => object.emotion === data.filename)
        for(let i = 0; i < sceneObjects.length; i++) {
          updateObject(sceneObjects[i].id, { emotion: null }) 
        }
        // ... and save it to the presets file
        let denylist = Object.keys(defaultEmotions)
        denylist.push(data.id)
        let filteredPoses = Object.values(state.presets.emotions)
          .filter(pose => denylist.includes(pose.id) === false)
          .reduce(
            (coll, pose) => {
              coll[pose.id] = pose
              return coll
            },
            {}
          )
        presetsStorage.saveEmotionsPresets({ emotions: filteredPoses })
      })
      deleteEmotionPreset(data.id)
      let emotionPath = path.join(path.dirname(storyboarderFilePath), data.filename)
      fs.remove(emotionPath)
    }

    const refClassName = classNames( "button__file", "button__file--selected")
    // allow a little text overlap
    const wrapperClassName = "button__file__wrapper"

    return <React.Fragment>
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
              onSelectFile(filePath.current)
            }}>
              Proceed
          </button>
        </div>
      </Modal>
      <div className="thumbnail-search column">
        <div className="row" style={{ padding: "6px 0" }}>
          <SearchList label="Search models …" list={ presets } onSearch={ saveFilteredPresets }/>
          <div className="column" style={{ alignSelf: "center", padding: 6, lineHeight: 1 } }>or</div>
          <FileInput value={ sceneObject.emotion ? selectValue() : "Select File …" }
                     title={ sceneObject.emotion ? path.basename(sceneObject.emotion) : undefined }
                     onChange={ onCreatePosePreset }
                     refClassName={ refClassName }
                     wrapperClassName={ wrapperClassName }/>
        </div>
        <Scrollable>
              <Grid
                itemData={{
                  id: sceneObject.id,
                  onSelectItem,
                  thumbnailRenderer,
                  textureLoader,
                  faceMesh,
                  attachment,
                  selectedSrc: sceneObject.emotion,
                  storyboarderFilePath,
                  onRemoval,
                }}
                Component={EmotionInspectorItem}
                elements={results}
                numCols={NUM_COLS}
                itemHeight={ITEM_HEIGHT}
              />
            </Scrollable>
      </div>
    </React.Fragment>
}))
export default EmotionsInspector
