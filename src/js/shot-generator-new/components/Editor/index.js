import React, { useState, useEffect, useRef, useContext, useMemo, useCallback } from 'react'
import { Provider, connect} from 'react-redux'

import fs from 'fs-extra'
import path from 'path'

import { ipcRenderer, remote } from 'electron'
const { dialog } = remote

import './../../../vendor/OutlineEffect'
import KeyHandler from './../KeyHandler'
import CameraPanelInspector from './../CameraPanelInspector'
import CamerasInspector from './../CamerasInspector'
import SceneManagerR3fLarge from '../../SceneManagerR3fLarge'
import SceneManagerR3fSmall from '../../SceneManagerR3fSmall'
import Toolbar from './../Toolbar'
import FatalErrorBoundary from './../FatalErrorBoundary'

import {useExportToGltf} from '../../../hooks/use-export-to-gltf'

import {createScene, removeScene, getScene} from './../../utils/scene'

import useComponentSize from './../../../hooks/use-component-size'
import { Canvas } from 'react-three-fiber'
import BonesHelper from '../../../xr/src/three/BonesHelper'
import {
  selectObject,

  createObject,
  setMainViewCamera,
  loadScene,
  setActiveCamera,
  resetScene,

  markSaved,

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
} from './../../../shared/reducers/shot-generator'


import notifications from './../../../window/notifications'
import Icon from "../Icon";
import MenuManager from "../MenuManager";
import ElementsPanel from "../ElementsPanel";
import BoardInspector from "../BoardInspector";
import GuidesInspector from "../GuidesInspector";
import createDeepEqualSelector from "../../../utils/deepEqualSelector"
import GuidesView from "../GuidesView"
import {useAsset} from '../../hooks/use-assets-manager'

const Editor = React.memo(({
  mainViewCamera, activeCamera, aspectRatio, setMainViewCamera, withState, store
}) => {
  const notificationsRef = useRef(null)
  const mainViewContainerRef = useRef(null)

  const largeCanvasSize = useComponentSize(mainViewContainerRef)

  const orthoCamera = useRef(new THREE.OrthographicCamera( -4, 4, 4, -4, 1, 10000 ))

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
  
  const {asset} = useAsset(path.join(window.__dirname, 'data', 'shot-generator', 'dummies', 'bone.glb'))
  const boneGltf = asset
  useMemo(() => {
    if(!boneGltf) return
    const mesh = boneGltf.scene.children.find(child => child.isMesh)
    if(mesh)
        BonesHelper.getInstance(mesh)
  }, [boneGltf])

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
                  <SceneManagerR3fSmall/>
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
                >
                <Provider store={ store }>
                  <SceneManagerR3fLarge/>
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
