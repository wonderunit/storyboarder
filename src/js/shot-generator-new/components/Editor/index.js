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

const Editor = React.memo(() => {
  const smallCanvasRef = useRef(null)
  const largeCanvasRef = useRef(null)
  const notificationsRef = useRef(null)

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
              {/*<ElementsPanel/>*/}
            </div>
          </div>

          <div className="column fill">
            <div id="camera-view">

            </div>
            <div className="inspectors">

            </div>
          </div>
        </div>
      </div>

      <KeyHandler/>

      <div
        className="notifications"
        ref={notificationsRef}
      />
    </FatalErrorBoundary>
  )
})

const withState = (fn) => (dispatch, getState) => fn(dispatch, getState())

export default connect(
  (state) => ({}),
  {
    withState
  }
)(Editor)