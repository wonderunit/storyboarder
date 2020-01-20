import React, { useState, useEffect, useRef, useContext, useMemo, useCallback } from 'react'
import { Provider, connect} from 'react-redux'

import fs from 'fs-extra'
import path from 'path'

import { ipcRenderer, remote } from 'electron'
const { dialog } = remote

import log from 'electron-log'

import './../../../vendor/OutlineEffect'
import KeyHandler from './../KeyHandler'
import CameraPanelInspector from './../CameraPanelInspector'
import CamerasInspector from './../CamerasInspector'
/*import {
  SceneContext,
  ElementsPanel,
  CameraInspector,
  BoardInspector,
  GuidesInspector,
  MenuManager,
  PhoneCursor,

  preventDefault,
  gltfLoader
} from './Components'*/
import SceneManager from './../../SceneManager'
//import GuidesView from './GuidesView'
//import Icon from './Icon'
import Toolbar from './../Toolbar'
import FatalErrorBoundary from './../FatalErrorBoundary'

import {useExportToGltf, loadCameraModel} from '../../../hooks/use-export-to-gltf'

import ModelLoader from './../../../services/model-loader'

import {createScene, removeScene, getScene} from './../../utils/scene'

import h from './../../../utils/h'
import useComponentSize from './../../../hooks/use-component-size'

import { useMachine } from '@xstate/react'
import { Machine } from 'xstate'

import {
  //
  //
  // action creators
  //
  selectObject,
  selectObjectToggle,

  createObject,
  updateObject,
  deleteObjects,

  duplicateObjects,

  selectBone,
  setMainViewCamera,
  loadScene,
  saveScene,
  updateCharacterSkeleton,
  setActiveCamera,
  resetScene,
  createScenePreset,
  updateScenePreset,
  deleteScenePreset,

  createPosePreset,
  updatePosePreset,
  deletePosePreset,

  updateWorld,
  updateWorldRoom,
  updateWorldEnvironment,

  markSaved,

  toggleWorkspaceGuide,

  undoGroupStart,
  undoGroupEnd,

  getSceneObjects,
  getSelections,
  getActiveCamera,
  getSelectedBone,
  getWorld,

  //
  //
  // selectors
  //
  getSerializedState,
  getIsSceneDirty
//} = require('../state')
} from './../../../shared/reducers/shot-generator'


import notifications from './../../../window/notifications'
import Icon from "../Icon";
import MenuManager from "../MenuManager";
import ElementsPanel from "../ElementsPanel";
import BoardInspector from "../BoardInspector";
import GuidesInspector from "../GuidesInspector";
import createDeepEqualSelector from "../../../utils/deepEqualSelector";

const Editor = React.memo(({
  mainViewCamera, createObject, selectObject, updateModels, loadScene, saveScene, activeCamera, setActiveCamera, resetScene, remoteInput, aspectRatio, sceneObjects, world, selections, selectedBone, onBeforeUnload, setMainViewCamera, withState, attachments, undoGroupStart, undoGroupEnd
}) => {
  const smallCanvasRef = useRef(null)
  const largeCanvasRef = useRef(null)
  const notificationsRef = useRef(null)
  const mainViewContainerRef = useRef(null)

  const largeCanvasSize = useComponentSize(mainViewContainerRef)

  const orthoCamera = useRef(new THREE.OrthographicCamera( -4, 4, 4, -4, 1, 10000 ))
  const [camera, setCamera ] = useState(null)

  useEffect(() => {
    if (notificationsRef.current) {
      notifications.init(notificationsRef.current, true)
    }
  }, [notificationsRef.current])

  useEffect(() => {
    createScene()
    // TODO introspect models
    //updateModels({})
    //setLocalState({value:{scene: scene.current}})
    // do any other pre-loading stuff here
    document.fonts.ready.then(() => {
      // let the app know we're ready to render
      //setReady(true)
    })
    return function cleanup () {
      removeScene()
    }
  }, [])

  useEffect(() => {
    setCamera(getScene().children.find(o => o.userData.id === activeCamera))
  }, [activeCamera])

  return (
    <FatalErrorBoundary>
      <div id="root">
        <Toolbar
          withState={withState}
          ipcRenderer={ipcRenderer}
          notifications={notifications}
        />
        <div id="main">
          <div id="aside">

            <div id="topdown">
              <canvas
                key="top-down-canvas"
                id="top-down-canvas"
                tabIndex={0}
                ref={smallCanvasRef}
              />
              <div className="topdown__controls">
                <div className="row"/>
                <div className="row">
                  <a href='#'>
                    <Icon src='icon-camera-view-expand'/>
                  </a>
                </div>
              </div>
            </div>

            <div id="elements">
              <ElementsPanel/>
            </div>
          </div>

          <div className="column fill">
            <div id="camera-view" ref={mainViewContainerRef}>
              <canvas
                key="camera-canvas"
                id="camera-canvas"
                tabIndex={1}
                ref={largeCanvasRef}
              />
            </div>
            <div className="inspectors">
              <CameraPanelInspector/>
              <BoardInspector/>
              <div>
                <CamerasInspector/>
                <GuidesInspector/>
              </div>
            </div>
          </div>
        </div>
      </div>

      <SceneManager
        largeCanvasRef={largeCanvasRef}
        smallCanvasRef={smallCanvasRef}
        attachments={attachments}
        orthoCamera={orthoCamera}
        camera={camera}
        setCamera={setCamera}
        largeCanvasSize={largeCanvasSize}
      />
      <KeyHandler/>
      <MenuManager/>

      <div
        className="notifications"
        ref={notificationsRef}
      />
    </FatalErrorBoundary>
  )
})

const withState = (fn) => (dispatch, getState) => fn(dispatch, getState())
const getSceneObjectsM = createDeepEqualSelector([getSceneObjects], sceneObjects => sceneObjects)
const getWorldM = createDeepEqualSelector([getWorld], world => world)
const getAttachmentsM = createDeepEqualSelector([(state) => state.attachments], attachments => attachments)

export default connect(
  (state) => ({
    mainViewCamera: state.mainViewCamera,
    activeCamera: getActiveCamera(state),
    remoteInput: state.input,
    aspectRatio: state.aspectRatio,
    sceneObjects: getSceneObjectsM(state),
    world: getWorldM(state),
    selectedBone: getSelectedBone(state),
    attachments: getAttachmentsM(state)
  }),
  {
    withState
  }
)(Editor)