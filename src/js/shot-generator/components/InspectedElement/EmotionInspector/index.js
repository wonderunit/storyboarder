import React, {
  useMemo,
  useRef,
  useState,
  useContext,
  useEffect
} from 'react'
import { connect, useDispatch } from 'react-redux'
import fs from 'fs-extra'
import path from 'path'
import { useTranslation } from 'react-i18next'
const remote = require('@electron/remote')
import * as THREE from 'three'
import { filter } from 'ramda'
import { Machine, assign } from 'xstate'
import { useMachine } from '@xstate/react'

import {
  getSceneObjects,
  getSelections,

  updateObject,
  createEmotionPreset,
  deleteEmotionPreset,

  undoGroupStart,
  undoGroupEnd
} from '../../../../shared/reducers/shot-generator'
import presetsStorage from '../../../../shared/store/presetsStorage'
import {
  NUM_COLS,
  ITEM_HEIGHT,
  CHARACTER_MODEL
} from '../../../utils/InspectorElementsSettings'
const { id: CHARACTER_MODEL_BASENAME } = CHARACTER_MODEL
import EmotionPresetThumbnailRenderer from './thumbnail-renderer'

import Grid from '../../Grid'
import GridItem from '../GridItem'
import Scrollable from '../../Scrollable'

import { useAsset } from '../../../hooks/use-assets-manager'
import {
  comparePresetNames,
  comparePresetPriority
} from '../../../utils/searchPresetsForTerms'
import SearchList from '../../SearchList'
import Modal from '../../Modal'
import HelpButton from '../../HelpButton'

import FilepathsContext from '../../../contexts/filepaths'

import systemEmotions from '../../../../shared/reducers/shot-generator-presets/emotions.json'

const HELP_URI = 'https://github.com/wonderunit/storyboarder/wiki/Creating-Emotions-for-Characters-in-Shot-Generator'

const shortId = (id) => id.toString().substr(0, 7).toLowerCase()

const promptForFilepath = async () => remote.dialog.showOpenDialog(null, {})

// TODO extract to store middleware or store subscriber
const writeEmotionPresets = () => {
  return (dispatch, getState) => {
    let allEmotions = getState().presets.emotions

    let userEmotions = filter(
      ({ id }) => systemEmotions[id] == null,
      allEmotions
    )

    presetsStorage.saveEmotionsPresets({ emotions: userEmotions })
  }
}

const emotionPresetFactory = ({ name, priority = 0 }) => ({
  id: THREE.Math.generateUUID(),
  name,
  priority
})

const createPreset = async (context, event) => {
  let { name, source, sceneObjectId, dispatch, getUserPresetPath, getThumbnailRenderer } = context

  // ensure the emotions user preset directory exists
  fs.mkdirpSync(getUserPresetPath('emotions'))

  let emotionPreset = emotionPresetFactory({ name })

  // import image to presets folder
  let src = source
  let dest = getUserPresetPath('emotions', `${emotionPreset.id}-texture.png`)
  fs.copyFileSync(src, dest)

  // load image as a Texture
  // TODO can this use loadAsset instead?
  let faceTexture = await new Promise((resolve, reject) => {
    new THREE.TextureLoader().load(
      dest,
      resolve,
      null,
      reject
    )
  })

  // generate and write the thumbnail
  let thumbnailFilePath = getUserPresetPath('emotions', `${emotionPreset.id}-thumbnail.jpg`)
  getThumbnailRenderer().render({ faceTexture })
  fs.writeFileSync(
    thumbnailFilePath,
    getThumbnailRenderer().toBase64('image/jpg'),
    'base64'
  )
  getThumbnailRenderer().clear()

  // create preset data
  dispatch(createEmotionPreset(emotionPreset))

  // write presets to file
  dispatch(writeEmotionPresets())

  // set emotion preset for current Character
  selectItem(
    { dispatch },
    {
      sceneObjectId,
      emotionPresetId: emotionPreset.id
    }
  )
}

const deletePreset = (context, event) => {
  let { dispatch, getUserPresetPath } = context
  let { id } = event

  // delete the preset
  dispatch(deleteEmotionPreset(id))

  // write presets to file
  dispatch(writeEmotionPresets())

  // delete the images
  let textureFilepath = getUserPresetPath('emotions', `${id}-texture.png`)
  let thumbnailFilepath = getUserPresetPath('emotions', `${id}-thumbnail.jpg`)

  fs.removeSync(textureFilepath)
  fs.removeSync(thumbnailFilepath)
}

const selectItem = (context, event) => {
  let { dispatch } = context
  let { sceneObjectId, emotionPresetId } = event

  dispatch(undoGroupStart())
  if (emotionPresetId) {
    dispatch(updateObject(sceneObjectId, { emotionPresetId }))
  } else {
    dispatch(updateObject(sceneObjectId, { emotionPresetId: undefined }))
  }
  dispatch(undoGroupEnd())
}

const machine = Machine({
  id: 'emotions',
  initial: 'idle',
  context: {
    placeholder: null,
    name: null,
    source: null,
    sceneObjectId: null
  },
  states: {
    idle: {
      on: {
        SELECT_FILE: 'selectFile',
        SELECT_ITEM: {
          actions: selectItem
        },
        DELETE_PRESET: {
          actions: deletePreset
        }
      }
    },
    selectFile: {
      entry: [
        assign({
          source: () => null,
          sceneObjectId: (context, event) => event.sceneObjectId
        }),
      ],
      invoke: {
        src: promptForFilepath,
        onDone: [
          {
            cond: (context, event) => event.data.canceled,
            target: 'idle'
          },
          {
            actions: assign({
              source: (context, event) => event.data.filePaths[0],
            }),
            target: 'prompt'
          }
        ]
      }
    },
    prompt: {
      entry: assign((context, event) => {
        let basename = path.basename(context.source, path.extname(context.source))
        let placeholder = `${basename}-${shortId(THREE.Math.generateUUID())}`
        return {
          placeholder,
          name: placeholder
        }
      }),
      exit: assign({
        placeholder: () => null
      }),
      on: {
        NAME: {
          actions: assign({ name: (context, event) => event.value })
        },
        CANCEL: 'idle',
        NEXT: 'save'
      }
    },
    save: {
      invoke: {
        src: createPreset,
        onDone: {
          target: 'idle'
        }
      }
    }
  }
})

const mapStateToProps = state => {
  let sceneObjects = getSceneObjects(state)

  let id = getSelections(state)[0]
  let sceneObject = sceneObjects[id]

  return {
    sceneObject,
    userEmotions: filter(
      ({ id }) => systemEmotions[id] == null,
      state.presets.emotions
    ),
    selectedPreset: state.presets.emotions[sceneObject.emotionPresetId]
  }
}
const EmotionInspector = connect(mapStateToProps)(
  React.memo(
    ({
      sceneObject,
      userEmotions,
      selectedPreset
    }) => {
      const { t } = useTranslation()
      const { getAssetPath, getUserPresetPath } = useContext(FilepathsContext)

      const { asset: characterGltf } = useAsset(getAssetPath('character', `${CHARACTER_MODEL_BASENAME}.glb`))
      const thumbnailRenderer = useRef()
      const getThumbnailRenderer = () => {
        if (thumbnailRenderer.current == null) {
          thumbnailRenderer.current = characterGltf
            ? new EmotionPresetThumbnailRenderer({ characterGltf })
            : null
        }
        return thumbnailRenderer.current
      }
      useEffect(() => {
        return function cleanup () {
          if (thumbnailRenderer.current) {
            thumbnailRenderer.current.dispose()
            thumbnailRenderer.current = null
          }
        }
      }, [])

      const dispatch = useDispatch()
      const [current, send, service] = useMachine(machine,{
        context: {
          dispatch,
          getAssetPath,
          getUserPresetPath,
          getThumbnailRenderer
        }
      })

      const onModalClose = () => {
        if (current.matches('prompt')) {
          send('CANCEL')
        }
      }

      const onDeletePreset = ({ id }) => {
        const choice = remote.dialog.showMessageBoxSync({
          type: 'question',
          buttons: [t('shot-generator.inspector.common.yes'), t('shot-generator.inspector.common.no')],
          message: t('shot-generator.inspector.common.are-you-sure'),
          defaultId: 1
        })

        if (choice !== 0) return

        send({ type: 'DELETE_PRESET', id })
      }

      const EMOTION_PRESET_NONE = {
        id: null,
        name: t('shot-generator.inspector.emotions.no-value'),
        keywords: undefined,
        priority: 0
      }

      const presets = [
        EMOTION_PRESET_NONE
      ].concat(
        [
          ...Object.values(systemEmotions),
          ...Object.values(userEmotions)
        ]
        .sort(comparePresetNames)
        .sort(comparePresetPriority)
      )

      const presetsAsGridItems = presets.map(({ id, name, keywords }) => ({
        title: name,
        src: id == null
          ? getAssetPath('emotion', `emotions-none.png`)
          : systemEmotions[id] != null
            ? getAssetPath('emotion', `${id}-thumbnail.jpg`)
            : getUserPresetPath('emotions', `${id}-thumbnail.jpg`),
        isSelected: id == null
          ? selectedPreset == null
          : selectedPreset && selectedPreset.id == id,
        id: id,
        onDelete: id == null || systemEmotions[id] != null ? null : onDeletePreset
      }))

      const searchList = useMemo(() =>
        presets.map(({ id, name, keywords }) => ({ id, value: name + ' ' + keywords })),
        [userEmotions]
      )

      const [resultIds, setResultIds] = useState([])
      const onSearch = results => setResultIds(results.map(r => r.id))
      const elements = presetsAsGridItems.filter(({ id }) => resultIds.includes(id))

      return <React.Fragment>
        <Modal visible={current.matches('prompt')} onClose={onModalClose}>
          <div style={{ margin: '5px 5px 5px 5px' }}>
            {t("shot-generator.inspector.common.select-preset-name")}
          </div>
          <div className="column" style={{ flex: 1 }}>
            <input
              className="modalInput"
              type="text"
              placeholder={current.context.placeholder}
              onChange={
                event => send({
                  type: 'NAME',
                  value: event.currentTarget.value || event.currentTarget.placeholder
                })
              }
            />
          </div>
          <div className="skeleton-selector__div">
            <button
              className="skeleton-selector__button"
              onClick={() => send('NEXT')}
            >
              {t("shot-generator.inspector.common.add-preset")}
            </button>
          </div>
        </Modal>

        <div className="thumbnail-search column">
          <div className="row" style={{ padding: '6px 0' }}>
            <SearchList
              label={t('shot-generator.inspector.emotions.search-list-label')}
              list={searchList}
              onSearch={onSearch}
            />

            <div className="column" style={{ marginLeft: 5 }}> 
              <a className="button_add" href="#"
                style={{ width: 30, height: 34 }}
                onPointerDown={() => send({
                  type: 'SELECT_FILE',
                  sceneObjectId: sceneObject.id
                })}
              >+</a>
            </div>

            <div
              className="column"
              style={{
                width: 20,
                margin: '0 0 0 6px',
                alignSelf: 'center',
                alignItems: 'flex-end'
              }}
            >
              <HelpButton
                url={HELP_URI}
                title={t("shot-generator.inspector.emotions.emotion-creation-help")}/>
            </div>
          </div>
          <div className="thumbnail-search__list">
            <Scrollable>
              <Grid
                itemData={{
                  onSelect: ({ id }) => send({
                    type: 'SELECT_ITEM',
                    sceneObjectId: sceneObject.id,
                    emotionPresetId: id
                  })
                }}
                Component={GridItem}
                elements={elements}
                numCols={NUM_COLS}
                itemHeight={ITEM_HEIGHT}
              />
            </Scrollable>
          </div>
        </div>

      </React.Fragment>
    }
  )
)
export default EmotionInspector
