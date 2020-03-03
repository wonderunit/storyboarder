import Inspector from './Inspector'
import { connect } from 'react-redux'
import React from 'react'

import ItemList from '../ItemList'
import {

    selectObject,
    selectObjectToggle,
  
    updateObject,
    deleteObjects,
  
    selectBone,
    updateCharacterSkeleton,
    setActiveCamera,
  
    updateWorld,
    updateWorldRoom,
    updateWorldEnvironment,
    updateWorldFog,
    undoGroupStart,
    undoGroupEnd,
    getSceneObjects,
    getSelections,
    getActiveCamera,
    getSelectedBone,
    getWorld,
  
  } from '../../../shared/reducers/shot-generator'

const ElementsPanel = connect(
  // what changes should we watch for to re-render?
  state => ({
    world: getWorld(state),
    sceneObjects: getSceneObjects(state),
    selections: getSelections(state),
    selectedBone: getSelectedBone(state),
    models: state.models,
    activeCamera: getActiveCamera(state),

    storyboarderFilePath: state.meta.storyboarderFilePath
  }),
  // what actions can we dispatch?
  {
    selectObject,
    selectObjectToggle,
    updateObject,
    deleteObjects,
    setActiveCamera,
    selectBone,
    updateCharacterSkeleton,
    updateWorld,
    updateWorldRoom,
    updateWorldEnvironment,
    updateWorldFog,
    undoGroupStart,
    undoGroupEnd
  }
)(
  React.memo(({ world, sceneObjects, models, selections, selectObject, selectObjectToggle, updateObject, deleteObjects, selectedBone, activeCamera, setActiveCamera, selectBone, updateCharacterSkeleton, updateWorld, updateWorldRoom, updateWorldEnvironment, updateWorldFog, storyboarderFilePath }) => {
    let kind = sceneObjects[selections[0]] && sceneObjects[selections[0]].type
    let data = sceneObjects[selections[0]]
    
    return (
        <div style = {{flex: 1, display: "flex", flexDirection: "column"}} >
          <div id="listing">
            <ItemList/>
          </div>
          <Inspector
              {...{
                world,

                kind,
                data,

                models, updateObject,

                selectedBone, selectBone,

                updateCharacterSkeleton,

                updateWorld,
                updateWorldRoom,
                updateWorldEnvironment,
                updateWorldFog,

                storyboarderFilePath,

                selections
              }}
          />
        </div>
    )
  }
))
export default ElementsPanel
