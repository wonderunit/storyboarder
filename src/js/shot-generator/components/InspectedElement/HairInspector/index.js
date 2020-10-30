import React, { useCallback, useState, useContext, useMemo } from 'react'
import { connect } from 'react-redux'
import { createSelector } from 'reselect'
import classNames from 'classnames'
import path from 'path'
import { useTranslation } from 'react-i18next'

import {
  createObject,
  selectAttachable,
  deselectAttachable,
  getSceneObjects,
  getSelections,
  deleteObjects,
  undoGroupStart,
  undoGroupEnd
} from '../../../../shared/reducers/shot-generator'

import * as itemSettings from '../../../utils/InspectorElementsSettings'

import Grid from '../../Grid'
import GridItem from '../GridItem'
import Scrollable from '../../Scrollable'

import SearchList from '../../SearchList'
import FileInput from '../../FileInput'
import HelpButton from '../../HelpButton'

import { truncateMiddle } from '../../../../utils'

import isUserModel from '../../../helpers/isUserModel'
import CopyFile from '../../../utils/CopyFile'

import FilepathsContext from '../../../contexts/filepaths'

const USER_MODEL_HAIR_POSITION = {
  "x": -0.0013,
  "y": 0.15,
  "z": 0.014
}

const shortBaseName = (filepath) =>
  truncateMiddle(path.basename(filepath, path.extname(filepath)), 13)

const createSceneObjectForAttachable = () => {
  return {
    id: THREE.Math.generateUUID(),

    type: 'attachable',
    attachableType: 'hair',
    bindBone: 'Head',

    x: 0,
    y: 0,
    z: 0,
    rotation: { x: 0, y: 0, z: 0 },

    size: 1,
    status: 'PENDING'
  }
}

const getAttachableModels = (state) =>
  Object.values(state.models).filter((m) => m.type === 'attachable')

const getAttachableHairModels = (state) =>
  getAttachableModels(state).filter((m) => m.attachableType === 'hair')

const getFirstSelectedSceneObject = createSelector(
  [getSceneObjects, getSelections],
  (sceneObjects, selections) => sceneObjects[selections[0]]
)

const getSelectedHair = createSelector(
  [getSceneObjects, getSelections],
  (sceneObjects, selections) =>
    selections[0]
      ? Object.values(sceneObjects).find(
          (item) =>
            item.type === 'attachable' &&
            item.attachableType === 'hair' &&
            item.attachToId === selections[0]
        )
      : undefined
)

const HairInspector = connect(
  (state) => ({
    selectedSceneObject: getFirstSelectedSceneObject(state),
    selectedHair: getSelectedHair(state),
    attachableHairModels: getAttachableHairModels(state),
    storyboarderFilePath: state.meta.storyboarderFilePath
  }),
  {
    createObject,
    selectAttachable,
    deselectAttachable,
    deleteObjects,
    undoGroupStart,
    undoGroupEnd
  }
)(
  React.memo(
    ({
      selectedSceneObject,
      selectedHair,
      attachableHairModels,
      storyboarderFilePath,
      createObject,
      selectAttachable,
      deselectAttachable,
      deleteObjects,
      undoGroupStart,
      undoGroupEnd
    }) => {
      const { t } = useTranslation()
      const [results, setResults] = useState()

      const { getAssetPath } = useContext(FilepathsContext)
      const GRID_ITEM_NONE_SRC = getAssetPath('attachable', `hair-none.png`)

      const onSelect = useCallback(
        (data) => {
          if (data && data.model) {
            undoGroupStart()

            if (selectedHair) {
              deleteObjects([selectedHair.id])
              deselectAttachable()
            }

            let sceneObject = {
              ...createSceneObjectForAttachable(),
              model: data.model,
              attachToId: selectedSceneObject.id,
              ...data.sceneObjectOverrides
            }

            createObject(sceneObject)
            selectAttachable({
              id: sceneObject.id,
              bindId: sceneObject.attachToId
            })
            
            undoGroupEnd()
          } else {
            if (selectedHair) {
              undoGroupStart()
              deleteObjects([selectedHair.id])
              deselectAttachable()
              undoGroupEnd()
            }
          }
        },
        [selectedSceneObject, selectedHair]
      )

      const onSelectFile = useCallback(
        (filepath) => {
          if (filepath.file) {
            let model = CopyFile(
              storyboarderFilePath,
              filepath.file,
              'attachable'
            )
            onSelect({
              model,
              sceneObjectOverrides: {
                name: path.basename(model, path.extname(model)),
                ...USER_MODEL_HAIR_POSITION
              }
            })
          } else {
            // uncomment if "cancel" should remove existing custom hair
            // onSelect(null)
          }
        },
        [storyboarderFilePath, onSelect]
      )

      let modelsList = [
        {
          id: null,
          model: null,
          keywords: '',
          name: t('shot-generator.inspector.hair.no-value')
        }
      ].concat(attachableHairModels)

      let searchList = useMemo(
        () => modelsList.map(({ id, name, keywords }) => ({
          value: [name, keywords].filter(Boolean).join(' '),
          id
        })),
        attachableHairModels
      )

      let matches =
        results == null
          ? modelsList
          : modelsList.filter((model) =>
              results.find((result) => result.id == model.id)
            )

      let elements = matches.map((attachable) => ({
        title: attachable.name.replace(/^Hair:\s+/, ''),

        src: attachable.id == null
          ? GRID_ITEM_NONE_SRC
          : getAssetPath(attachable.type, `${attachable.id}.jpg`),

        isSelected: attachable.id == null
          ? selectedHair == null
          : selectedHair && attachable.id === selectedHair.model,

        model: attachable.id,

        sceneObjectOverrides: {
          name: attachable.name,
          x: attachable.x,
          y: attachable.y,
          z: attachable.z,
          rotation: attachable.rotation
        }
      }))

      let isCustom = selectedHair && isUserModel(selectedHair.model)

      const refClassName = classNames('button__file', {
        'button__file--selected': isCustom
      })

      const wrapperClassName = 'button__file__wrapper'

      return (
        <>
          <div className="thumbnail-search column">
            <div className="row" style={{ padding: '6px 0' }}>
              <SearchList
                label="Search Hair …"
                list={searchList}
                onSearch={setResults}
              />

              {isCustom ? (
                <div className="column" style={{ padding: 2 }} />
              ) : (
                <div
                  className="column"
                  style={{ alignSelf: 'center', padding: 6, lineHeight: 1 }}
                >
                  or
                </div>
              )}

              <FileInput
                value={
                  isCustom
                    ? shortBaseName(selectedHair.model)
                    : t('shot-generator.inspector.common.select-file')
                }
                onChange={onSelectFile}
                refClassName={refClassName}
                wrapperClassName={wrapperClassName}
              />
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
                  url="https://github.com/wonderunit/storyboarder/wiki/Creating-custom-3D-Models-for-Shot-Generator"
                  title="How to Create 3D Models for Custom Objects"
                />
              </div>
            </div>
            <div className="thumbnail-search__list">
              <Scrollable>
                <Grid
                  itemData={{ onSelect }}
                  Component={GridItem}
                  elements={elements}
                  numCols={itemSettings.NUM_COLS}
                  itemHeight={itemSettings.ITEM_HEIGHT}
                />
              </Scrollable>
            </div>
          </div>
        </>
      )
    }
  )
)

export default HairInspector
