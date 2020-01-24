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
import SceneManagerR3fLarge from '../../SceneManagerR3fLarge'
import SceneManagerR3fSmall from '../../SceneManagerR3fSmall'
import Toolbar from './../Toolbar'
import FatalErrorBoundary from './../FatalErrorBoundary'

import {useExportToGltf, loadCameraModel} from '../../../hooks/use-export-to-gltf'

import ModelLoader from './../../../services/model-loader'

import {createScene, removeScene, getScene} from './../../utils/scene'

import useComponentSize from './../../../hooks/use-component-size'
import SceneRender from '../../SceneRenderer'
import { Canvas } from 'react-three-fiber'

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
import { useAssetsManager } from '../../hooks/use-assets-manager'
import getFilepathForModelByType from '../../helpers/get-filepath-for-model-by-type'
import {gltfLoader} from "../../utils/gltfLoader"

const Editor = React.memo(({
  mainViewCamera, createObject, selectObject, updateModels, loadScene, saveScene, activeCamera, setActiveCamera, resetScene, remoteInput, aspectRatio, sceneObjects, world, selections, selectedBone, onBeforeUnload, setMainViewCamera, withState, attachments, undoGroupStart, undoGroupEnd, store
}) => {
  const smallCanvasRef = useRef(null)
  const largeCanvasRef = useRef(null)
  const notificationsRef = useRef(null)
  const mainViewContainerRef = useRef(null)

  const largeCanvasSize = useComponentSize(mainViewContainerRef)

  const orthoCamera = useRef(new THREE.OrthographicCamera( -4, 4, 4, -4, 1, 10000 ))
  const { assets, requestAsset, getAsset } = useAssetsManager()

  /** Resources loading */
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

  useEffect(() => {

    let storyboarderFilePath 
    withState((dispatch, state) => {
      storyboarderFilePath = state.meta.storyboarderFilePath
    })
    Object.values(sceneObjects)
      // has a value for model
      .filter(o => o.model != null)
      // is not a box
      .filter(o => !(o.type === 'object' && o.model === 'box'))
      // what's the filepath?
      .map((object) => ModelLoader.getFilepathForModel(object, { storyboarderFilePath }))
      // has not been requested
      .filter(filepath => getAsset(filepath) == null)
      // request the file
      .forEach(requestAsset)
  }, [sceneObjects])

  useEffect(() => {

    let storyboarderFilePath 
    withState((dispatch, state) => {
      storyboarderFilePath = state.meta.storyboarderFilePath
    })
    if (world.environment.file) {
      console.log(world.environment)
      // TODO figure out why gltf.scene.children of environment becomes empty array when changing between boards
      const environmentPath =  ModelLoader.getFilepathForModel({
        model: world.environment.file,
        type: 'environment'
      }, { storyboarderFilePath })

      delete assets[environmentPath]

      requestAsset(ModelLoader.getFilepathForModel({
        model: world.environment.file,
        type: 'environment'
      }, { storyboarderFilePath })
      )
    }
  }, [world.environment])

  /** Resources loading end */

  /** Shot generating */

    // used by onToolbarSaveToBoard and onToolbarInsertAsNewBoard
  const imageRenderer = useRef()

  const saveShot = (dispatch, state) => {
    let { cameraImage, plotImage } = renderImagesForBoard(state)

    ipcRenderer.send('saveShot', {
      uid: state.board.uid,
      data: getSerializedState(state),
      images: {
        'camera': cameraImage,
        'plot': plotImage
      }
    })

    dispatch(markSaved())
  }

  const insertShot = (dispatch, state) => {
    let { cameraImage, plotImage } = renderImagesForBoard(state)

    // NOTE we do this first, since we get new data on insertShot complete
    dispatch(markSaved())

    ipcRenderer.send('insertShot', {
      data: getSerializedState(state),
      images: {
        camera: cameraImage,
        plot: plotImage
      },
      currentBoard: state.board
    })
  }

  // setup refs
  const saveShotFn = useRef()
  const insertShotFn = useRef()
  // always point refs to updated functions
  saveShotFn.current = saveShot
  insertShotFn.current = insertShot
  // add handlers once, and use refs for callbacks
  useEffect(() => {
    ipcRenderer.on('requestSaveShot', () => {
      withState((dispatch, state) => {
        saveShotFn.current(dispatch, state)
      })
    })
    ipcRenderer.on('requestInsertShot', () => {
      withState((dispatch, state) => {
        insertShotFn.current(dispatch, state)
      })
    })
  }, [])

  const renderImagesForBoard = state => {
    if (!imageRenderer.current) {
      imageRenderer.current = new THREE.OutlineEffect(
        new THREE.WebGLRenderer({ antialias: true }), { defaultThickness:0.008 }
      )
    }

    const scene = getScene()

    let imageRenderCamera = scene.children.find(o => o.userData.id === activeCamera).clone()
    imageRenderCamera.layers.set(0)
    imageRenderCamera.layers.enable(3)


    //
    //
    // Prepare for rendering as an image
    //

    let selected = scene.children.find(child =>
      (
        child.userData.type === 'character' ||
        child.userData.type === 'object'
      ) &&
      child.userData.id === getSelections(state)[0])

    let material = selected &&
      ((selected.userData.type === 'character')
        ? selected.userData.mesh.material
        // TODO support multiple child Object3D’s in a Group
        : selected.children[0].material)

    // save memento
    let memento = material && { color: material.userData.outlineParameters.color }




    // override selection outline effect color from selected Object3D’s material
    if (memento) {
      material.userData.outlineParameters.color = [0, 0, 0]
    }




    // render the image
    imageRenderer.current.setSize(Math.ceil(900 * state.aspectRatio), 900)
    imageRenderer.current.render(scene, imageRenderCamera)
    let cameraImage = imageRenderer.current.domElement.toDataURL()



    // restore from memento
    if (memento) {
      material.userData.outlineParameters.color = memento.color
    }


    let savedBackground = scene.background && scene.background.clone()
    scene.background = new THREE.Color( '#FFFFFF' )
    imageRenderer.current.setSize(900, 900)
    imageRenderer.current.render(scene, orthoCamera.current)
    let plotImage = imageRenderer.current.domElement.toDataURL()
    scene.background = savedBackground



    return { cameraImage, plotImage }
  }

  /** Shot generating end */

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
              <Canvas
                key="top-down-canvas"
                id="top-down-canvas"
                tabIndex={0}
                /* onPointerDown={ onCanvasPointerDown } */
                orthographic={ true }
                updateDefaultCamera={ false }>
                <Provider store={ store }>
                  <SceneManagerR3fSmall 
                    getAsset={ getAsset }/>
                </Provider>
              </Canvas>
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
              <Canvas
                key="camera-canvas"
                id="camera-canvas"
                tabIndex={1}
               // ref={largeCanvasRef}
                /* onPointerDown={onCanvasPointerDown} */
                >
                <Provider store={ store }>
                  <SceneManagerR3fLarge 
                  getAsset={ getAsset }/>
                </Provider>
              </Canvas>
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

 {/*      <SceneManager
        largeCanvasRef={largeCanvasRef}
        smallCanvasRef={smallCanvasRef}
        attachments={attachments}
        orthoCamera={orthoCamera}
        largeCanvasSize={largeCanvasSize}
      /> */}
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
    setMainViewCamera,

    createObject,
    selectObject,
    updateModels: payload => ({ type: 'UPDATE_MODELS', payload }),
    loadScene,
    saveScene: filepath => (dispatch, getState) => {
      let state = getState()
      let contents = getSerializedState(state)
      fs.writeFileSync(filepath, JSON.stringify(contents, null, 2))
      dialog.showMessageBox(null, { message: 'Saved!' })
      // dispatch(markSaved())
    },
    setActiveCamera,
    resetScene,

    onBeforeUnload: event => (dispatch, getState) => {
      if (getIsSceneDirty(getState())) {
        // pass electron-specific flag
        // to trigger `will-prevent-unload` on BrowserWindow
        event.returnValue = false
      }
    },
    markSaved,

    undoGroupStart,
    undoGroupEnd
  }
)(Editor)