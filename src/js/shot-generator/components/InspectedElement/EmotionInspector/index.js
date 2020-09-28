import React, {
  useMemo,
  useRef,
  useState,
  useContext,
  useEffect
} from 'react'
import { connect, useDispatch } from 'react-redux'
import { createSelector } from 'reselect'
import fs from 'fs-extra'
import path from 'path'
import { useTranslation } from 'react-i18next'
import { remote } from 'electron'
import * as THREE from 'three'
import { filter } from 'ramda'

import {
  getSceneObjects,
  getSelections,

  updateObject,
  createEmotionPreset,
  deleteEmotionPreset,

  createObject,
  deleteObjects,

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

import FilepathsContext from '../../../contexts/filepaths'

import systemEmotions from '../../../../shared/reducers/shot-generator-presets/emotions.json'

import { Machine, assign } from 'xstate'
import { useMachine } from '@xstate/react'

const shortId = (id) => id.toString().substr(0, 7).toLowerCase()

const promptForFilepath = async () => remote.dialog.showOpenDialog(null, {})

const getFirstSelectedSceneObject = createSelector(
  [getSceneObjects, getSelections],
  (sceneObjects, selections) => sceneObjects[selections[0]]
)

const getEmotionAttachableByCharacterId = (sceneObjects, id) =>
  Object.values(sceneObjects)
      .find(s =>
        s.type === 'attachable' &&
        s.attachableType === 'emotion' &&
        s.attachToId === id
      )

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

const emotionAttachableFactory = (changes) => ({
  id: THREE.Math.generateUUID(),

  type: 'attachable',

  x: 0,
  y: 0,
  z: 0,
  rotation: { x: 0, y: 0, z: 0 },
  size: 1,

  model: null,
  attachableType: 'emotion',
  bindBone: 'Head',
  ...changes
})

const emotionPresetFactory = ({ name, priority = 0 }) => ({
  id: THREE.Math.generateUUID(),
  name,
  priority
})

const createPreset = async (context, event) => {
  console.log('createPreset', context)
  let { name, source, dispatch, getUserPresetPath, getThumbnailRenderer } = context

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
      attachableId: context.attachableId,
      attachToId: context.attachToId,
      presetId: emotionPreset.id,
      name
    }
  )
}

const deletePreset = (context, event) => {
  let { dispatch, getUserPresetPath } = context
  let { id, sceneObject, emotionAttachable } = event

  console.log('delete preset', id, 'used by character', sceneObject, 'via attachable', emotionAttachable)

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
  console.log('selectItem', context, event)

  let { dispatch } = context
  let { attachableId, presetId, attachToId, name } = event

  dispatch(undoGroupStart())

  if (presetId) {
    let changes = {
      presetId,
      attachToId,
      name
    }

    if (attachableId) {
      console.log('updateObject', attachableId, changes)
      dispatch(updateObject(attachableId, changes))
    } else {
      let emotionAttachable = emotionAttachableFactory(changes)
      console.log('createObject', emotionAttachable)
      dispatch(createObject(emotionAttachable))
    }
  } else {
    console.log('deleteObjects', attachableId)
    dispatch(deleteObjects([attachableId]))
  }

  dispatch(undoGroupEnd())
}

const machine = Machine({
  id: 'emotions',
  initial: 'idle',
  context: {
    placeholder: null,
    name: null,
    source: null
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
          attachToId: (context, event) => event.attachToId,
          attachableId: (context, event) => event.attachableId
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
          ...context,
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

  let emotionAttachable = getEmotionAttachableByCharacterId(sceneObjects, sceneObject.id)

  return {
    sceneObject,
    userEmotions: filter(
      ({ id }) => systemEmotions[id] == null,
      state.presets.emotions
    ),
    emotionAttachable
  }
}
const EmotionInspector = connect(mapStateToProps)(
  React.memo(
    ({
      sceneObject,
      userEmotions,
      emotionAttachable
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

        send({ type: 'DELETE_PRESET', id, sceneObject, emotionAttachable })
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
          ? emotionAttachable == null
          : emotionAttachable && emotionAttachable.presetId == id,
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
              label="Search Your Emotions …"
              list={searchList}
              onSearch={onSearch}
            />

            <div className="column" style={{ marginLeft: 5 }}> 
              <a className="button_add" href="#"
                style={{ width: 30, height: 34 }}
                onPointerDown={() => send({
                  type: 'SELECT_FILE',
                  attachToId: sceneObject.id,
                  attachableId: emotionAttachable && emotionAttachable.id
                })}
              >+</a>
            </div>
          </div>
          {
            (emotionAttachable && emotionAttachable.presetId == null) &&
             <div className="row" style={{ padding: '6px 0' }}>
              Embedded: {shortId(emotionAttachable.id)} ({emotionAttachable.name})
             </div>
          }          
          <div className="thumbnail-search__list">
            <Scrollable>
              <Grid
                itemData={{
                  onSelect: ({ id, title }) => send({
                    type: 'SELECT_ITEM',
                    attachToId: sceneObject.id,
                    attachableId: emotionAttachable && emotionAttachable.id,
                    presetId: id,
                    name: title
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
