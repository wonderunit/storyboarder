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
import SceneManager from './../../SceneManager'
import Toolbar from './../Toolbar'
import FatalErrorBoundary from './../FatalErrorBoundary'

import {useExportToGltf, loadCameraModel} from '../../../hooks/use-export-to-gltf'

import ModelLoader from './../../../services/model-loader'

import {createScene, removeScene, getScene} from './../../utils/scene'

import useComponentSize from './../../../hooks/use-component-size'

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
import createDeepEqualSelector from "../../../utils/deepEqualSelector"
import GuidesView from "../GuidesView"

import {gltfLoader} from "../../utils/gltfLoader"

const loadAttachment = ({ filepath, dispatch }) => {
  switch (path.extname(filepath)) {
    case '.obj':
      objLoader.load(
        filepath,
        event => {
          let value = { scene: event.detail.loaderRootNode }
          log.info('cache: success', filepath)
          dispatch({ type: 'ATTACHMENTS_SUCCESS', payload: { id: filepath, value } })
        },
        null,
        error => {
          log.error('cache: error')
          log.error(error)
          alert(error)
          // dispatch({ type: 'ATTACHMENTS_ERROR', payload: { id: filepath, error } })
          dispatch({ type: 'ATTACHMENTS_DELETE', payload: { id: filepath } })
        }
      )
      return dispatch({ type: 'ATTACHMENTS_LOAD', payload: { id: filepath } })

    case '.gltf':
    case '.glb':
      gltfLoader.load(
        filepath,
        value => {
          log.info('cache: success', filepath)
          dispatch({ type: 'ATTACHMENTS_SUCCESS', payload: { id: filepath, value } })
        },
        null,
        error => {
          log.error('cache: error')
          log.error(error)
          alert(error)
          // dispatch({ type: 'ATTACHMENTS_ERROR', payload: { id: filepath, error } })
          dispatch({ type: 'ATTACHMENTS_DELETE', payload: { id: filepath } })

        }
      )
      return dispatch({ type: 'ATTACHMENTS_LOAD', payload: { id: filepath } })
  }
}

const loadSceneObjects = async (dispatch, state) => {
  let storyboarderFilePath = state.meta.storyboarderFilePath
  loadCameraModel(storyboarderFilePath)
  const loadables = Object.values(getSceneObjects(state))
  // has a value for model
  .filter(o => o.model != null)
  // loaded false or undefined or null
  .filter(o => o.loaded !== true)

  for (let loadable of loadables) {
    // don't try to load the box
    if (loadable.type === 'object' && loadable.model === 'box') {
      continue
    }

    let expectedFilepath = ModelLoader.getFilepathForModel(loadable, { storyboarderFilePath })

    // grab the latest state
    withState(async (dispatch, state) => {
      // if it's in the cache already, skip
      if (state.attachments[expectedFilepath]) return

      // prevent doubling up
      dispatch({ type: 'ATTACHMENTS_PENDING', payload: { id: expectedFilepath } })

      // if absolute filepath does not exist ...
      if (!fs.existsSync(expectedFilepath)) {
        // ... ask the artist to locate it
        try {

          const choice = dialog.showMessageBox({
            type: 'question',
            buttons: ['Yes', 'No'],
            title: 'Model file not found',
            message: `Could not find model file at ${expectedFilepath}. Try to find it?`,
          })

          const shouldRelocate = (choice === 0)

          if (!shouldRelocate) {
            throw new Error('could not relocate missing file')
          }

          let updatedFilepath = await new Promise((resolve, reject) => {
            dialog.showOpenDialog(
              {
                title: 'Locate model file',
                defaultPath: path.dirname(expectedFilepath),
                filters: [
                  {
                    name: 'Model',
                    extensions: ['gltf', 'glb']
                  }
                ]
              },
              filenames => {
                if (filenames) {
                  resolve(filenames[0])
                } else {
                  reject('no alternate filepath provided')
                }
              }
            )
          })


          // remove the pending absolute path from attachments
          dispatch({ type: 'ATTACHMENTS_DELETE', payload: { id: expectedFilepath } })
          // update ALL instances of the model with the new location
          dispatch({
            type: 'ATTACHMENTS_RELOCATE',
            payload: {
              src: expectedFilepath,
              dst: updatedFilepath
            }
          })
          return

        } catch (error) {
          log.error(error)

          dispatch({ type: 'ATTACHMENTS_DELETE', payload: { id: expectedFilepath } })
          return
        }
      }
      if (ModelLoader.needsCopy(loadable)) {
        let src = expectedFilepath

        let dst = path.join(
          path.dirname(storyboarderFilePath),
          ModelLoader.projectFolder(loadable.type),
          path.basename(expectedFilepath)
        )

        log.info('will copy from', src, 'to', dst)

        // make sure the path exists
        fs.ensureDirSync(path.dirname(dst))

        // as long as they are different files, we need to copy them
        if (src !== dst) {

          log.info(`copying model file from ${src} to ${dst}`)
          fs.copySync(src, dst, { overwrite: true, errorOnExist: false })
        }

        // update it in the data
        let updatedModel = path.join(
          ModelLoader.projectFolder(loadable.type),
          path.basename(dst)
        )

        dispatch(updateObject(loadable.id, { model: updatedModel }))

        // remove the pending absolute path from attachments
        dispatch({ type: 'ATTACHMENTS_DELETE', payload: { id: src } })
        return
      }

      loadAttachment({ filepath: expectedFilepath, dispatch })
    })
  }
}

const loadWorldEnvironment = async (dispatch, state) => {
  let storyboarderFilePath = state.meta.storyboarderFilePath

  let expectedFilepath = ModelLoader.getFilepathForModel({
    model: world.environment.file,
    type: 'environment'
  }, { storyboarderFilePath })

  withState(async (dispatch, state) => {
    if (state.attachments[expectedFilepath]) return

    dispatch({ type: 'ATTACHMENTS_PENDING', payload: { id: expectedFilepath } })

    if (!fs.existsSync(expectedFilepath)) {
      try {

        const choice = dialog.showMessageBox({
          type: 'question',
          buttons: ['Yes', 'No'],
          title: 'Model file not found',
          message: `Could not find model file at ${expectedFilepath}. Try to find it?`,
        })

        const shouldRelocate = (choice === 0)

        if (!shouldRelocate) {
          throw new Error('could not relocate missing file')
        }

        let updatedFilepath = await new Promise((resolve, reject) => {
          dialog.showOpenDialog(
            {
              title: 'Locate model file',
              defaultPath: path.dirname(expectedFilepath),
              filters: [
                {
                  name: 'Model',
                  extensions: ['gltf', 'glb']
                }
              ]
            },
            filenames => {
              if (filenames) {
                resolve(filenames[0])
              } else {
                reject('no alternate filepath provided')
              }
            }
          )
        })

        log.info('user selected updatedFilepath:', updatedFilepath)

        // TODO test:
        // handle case where user relocated to a file in the models/* folder
        //

        // remove the pending absolute path from attachments
        dispatch({ type: 'ATTACHMENTS_DELETE', payload: { id: expectedFilepath } })
        // update the instance
        dispatch({
          type: 'UPDATE_WORLD_ENVIRONMENT',
          payload: {
            file: updatedFilepath
          }
        })
        return

      } catch (error) {
        log.error(error)
        dispatch({ type: 'ATTACHMENTS_DELETE', payload: { id: expectedFilepath } })
        return
      }
    }

    let loadable = {
      model: world.environment.file,
      type: 'environment'
    }
    if (ModelLoader.needsCopy(loadable)) {
      let src = expectedFilepath

      let dst = path.join(
        path.dirname(storyboarderFilePath),
        ModelLoader.projectFolder(loadable.type),
        path.basename(expectedFilepath)
      )

      log.info('will copy from', src, 'to', dst)

      fs.ensureDirSync(path.dirname(dst))

      if (src !== dst) {
        log.info(`copying model file from ${src} to ${dst}`)
        fs.copySync(src, dst, { overwrite: true, errorOnExist: false })
      }

      let updatedModel = path.join(
        ModelLoader.projectFolder(loadable.type),
        path.basename(dst)
      )

      log.info('copied! updated model:', updatedModel)
      dispatch({
        type: 'UPDATE_WORLD_ENVIRONMENT',
        payload: {
          file: updatedModel
        }
      })
      dispatch({ type: 'ATTACHMENTS_DELETE', payload: { id: src } })
      return
    }

    loadAttachment({ filepath: expectedFilepath, dispatch })
  })
}

const Editor = React.memo(({
  mainViewCamera, createObject, selectObject, updateModels, loadScene, saveScene, activeCamera, setActiveCamera, resetScene, remoteInput, aspectRatio, sceneObjects, world, selections, selectedBone, onBeforeUnload, setMainViewCamera, withState, attachments, undoGroupStart, undoGroupEnd
}) => {
  const smallCanvasRef = useRef(null)
  const largeCanvasRef = useRef(null)
  const notificationsRef = useRef(null)
  const mainViewContainerRef = useRef(null)

  const largeCanvasSize = useComponentSize(mainViewContainerRef)

  const orthoCamera = useRef(new THREE.OrthographicCamera( -4, 4, 4, -4, 1, 10000 ))

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

  useExportToGltf(getScene())

  // HACK
  // always pre-load the adult-male model
  // because we use it for PosePresetsEditor thumbnail generation
  useEffect(() => {
    withState(dispatch => {
      let filepath = ModelLoader.getFilepathForModel(
        { model: 'adult-male', type: 'character' },
        { storyboarderFilePath: null }
      )
      loadAttachment({ filepath, dispatch })
    })
  }, [])

  useEffect(() => {
    withState(loadSceneObjects)
  }, [sceneObjects])

  useEffect(() => {
    if (world.environment.file) {
      withState(loadWorldEnvironment)
    }
  }, [world.environment.file])

  const guidesDimensions = useMemo(() => {
    return {
      width: Math.ceil((largeCanvasSize.width || window.innerWidth)),
      height: Math.ceil((largeCanvasSize.width  || window.innerWidth) / aspectRatio)
    }
  }, [largeCanvasSize.width])

  const onCanvasPointerDown = useCallback(event => {
    event.preventDefault()
    event.target.focus()
  }, [])

  const onSwapCameraViewsClick = useCallback((event) => {
    event.preventDefault()
    setMainViewCamera(mainViewCamera === 'ortho' ? 'live' : 'ortho')
  }, [mainViewCamera])

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
                onPointerDown={onCanvasPointerDown}
              />
              <div className="topdown__controls">
                <div className="row"/>
                <div className="row">
                  <a href='#' onClick={onSwapCameraViewsClick}>
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
                onPointerDown={onCanvasPointerDown}
              />
              <GuidesView
                dimensions={guidesDimensions}
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
    withState,
    setMainViewCamera
  }
)(Editor)