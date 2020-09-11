import React, { useCallback, useState } from 'react'
import { connect } from 'react-redux'
import { createSelector } from 'reselect'

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
import { preventDefault } from '../../../utils/preventDefault'

import Grid from '../../Grid'
import GridItem from '../GridItem'
import Scrollable from '../../Scrollable'

import SearchList from '../../SearchList'

import ModelLoader from '../../../../services/model-loader'

const createAttachableSceneObject = ({ model, attachToId }) => {
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
    status: 'PENDING',

    model,
    attachToId
  }
}

const getAttachableModels = (state) =>
  Object.values(state.models)
    .filter(m => m.type === 'attachable')

const getAttachableHairModels = (state) =>
  getAttachableModels(state)
    .filter(m => m.attachableType === 'hair')

const getFirstSelectedSceneObject = createSelector(
  [getSceneObjects, getSelections],
  (sceneObjects, selections) => sceneObjects[selections[0]]
)

const getSelectedHair = createSelector(
  [getSceneObjects, getSelections],
  (sceneObjects, selections) => selections[0]
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
    attachableHairModels: getAttachableHairModels(state)
  }),
  {
    createObject,
    selectAttachable,
    deselectAttachable,
    deleteObjects
  }
)(
  React.memo(
    ({
      selectedSceneObject,
      selectedHair,
      attachableHairModels,
      createObject, selectAttachable, deselectAttachable, deleteObjects
    }) => {
      const [results, setResults] = useState()

      const onSelect = useCallback(
        data => {
          if (data) {
            console.log('adding hair attachable', data)

            undoGroupStart()

            if (selectedHair) {
              deleteObjects([selectedHair.id])
              deselectAttachable()
            }

            let sceneObject = {
              ...createAttachableSceneObject({
                model: data.model.id,
                attachToId: selectedSceneObject.id
              }),
              ...{
                name: data.model.name,
                x: data.model.x,
                y: data.model.y,
                z: data.model.z,
                rotation: data.model.rotation
              }
            }
            createObject(sceneObject)
            selectAttachable({ id: sceneObject.id, bindId: sceneObject.attachToId })

            undoGroupEnd()
          } else {
            console.log('removing hair attachable', selectedHair)

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

      let searchList = attachableHairModels.map(
        ({ id, name, keywords }) => ({
            value: [name, keywords]
              .filter(Boolean)
              .join(' '),
            id
          })
      )

      let matches = results == null
        ? attachableHairModels
        : attachableHairModels.filter(model => results.find(result => result.id == model.id))

      let elements = matches
        .map(model => ({
          model: {
            ...model,
            name: model.name.replace(/^Hair:\s+/, '')
          },
          src: ModelLoader.getFilepathForModel(
            { model: model.id, type: model.type },
            { storyboarderFilePath: null }
          ).replace(/.glb$/, '.jpg'),
          isSelected: selectedHair && model.id === selectedHair.model
        }))

      return <>
        <div className="thumbnail-search column">
          <div className="row" style={{ marginBottom: 6 }}>
            <SearchList
              label="Search Hair …"
              list={searchList}
              onSearch={setResults}
            />
          </div>
          <div className="column">
            <div className="row" style={{ marginBottom: 6 }}>
              <a
                href="#"
                className="button__simple"
                disabled={selectedHair == null}
                onPointerDown={event => preventDefault(onSelect(null))}
              >
                No Hair
              </a>
            </div>
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
    }
  )
)

export default HairInspector
