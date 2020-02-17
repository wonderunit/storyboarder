import React, { useState, useEffect, useRef, useContext, useMemo, useCallback } from 'react'
import { Provider, connect} from 'react-redux'

import fs from 'fs-extra'
import path from 'path'

import { ipcRenderer, remote } from 'electron'
const { dialog } = remote

import log from 'electron-log'

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

import {Canvas, extend, useFrame, useThree} from 'react-three-fiber'

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
import {useAsset, cleanUpCache} from '../../hooks/use-assets-manager'

import {OutlineEffect} from './../../../vendor/OutlineEffect'

const Effect = ({renderData}) => {
  const {gl, size} = useThree()

  const outlineEffect = new OutlineEffect(gl, { defaultThickness: 0.015 })
  
  useEffect(() => void outlineEffect.setSize(size.width, size.height), [size])
  useFrame(({ gl, scene, camera }) => {
    if(renderData) {
      outlineEffect.render(renderData.scene, renderData.camera)
    } else {
      outlineEffect.render(scene, camera)
    }
  }, 1)
  
  return null
}

const Editor = React.memo(({
  mainViewCamera, sceneObjects, world, activeCamera, aspectRatio, setMainViewCamera, withState, store
}) => {
  const notificationsRef = useRef(null)
  const mainViewContainerRef = useRef(null)
  const largeCanvasInfo = useRef({ width: 0, height: 0 })

  const largeCanvasSize = useComponentSize(mainViewContainerRef)


  /** Resources loading end */

  useEffect(() => {
    if (notificationsRef.current) {
      notifications.init(notificationsRef.current, true)
    }
  }, [notificationsRef.current])

/*   useEffect(() => {
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
  }, []) */


  useEffect(() => {
    console.log("Mount")
    cleanUpCache()
    return () => {
      console.log("Unmount")
      cleanUpCache()
    }
  }, [])



  const guidesDimensions = useMemo(() => {
    return {
      width: Math.ceil((largeCanvasSize.width || window.innerWidth)),
      height: Math.ceil((largeCanvasSize.width  || window.innerWidth) / aspectRatio)
    }
  }, [largeCanvasSize.width, largeCanvasSize.height, aspectRatio])

  const onCanvasPointerDown = useCallback(event => {
    event.preventDefault()
    event.target.focus()
  }, [])

  const onSwapCameraViewsClick = useCallback((event) => {
    event.preventDefault()
    setMainViewCamera(mainViewCamera === 'ortho' ? 'live' : 'ortho')
    selectObject(null)
  }, [mainViewCamera])
  
  const {asset} = useAsset(path.join(window.__dirname, 'data', 'shot-generator', 'dummies', 'bone.glb'))
  const boneGltf = asset
  useMemo(() => {
    if(!boneGltf) return
    const mesh = boneGltf.scene.children.find(child => child.isMesh)
    if(mesh)
        BonesHelper.getInstance(mesh)
  }, [boneGltf])

  useMemo(() => {
    if(!largeCanvasSize.width || !largeCanvasSize.height || !aspectRatio) return
    let width = Math.ceil(largeCanvasSize.width)
    // assign a target height, based on scene aspect ratio
    let height = Math.ceil(width / aspectRatio)
    
    if (height > largeCanvasSize.height) {
      height = Math.ceil(largeCanvasSize.height)
      width = Math.ceil(height * aspectRatio)
    }
    largeCanvasInfo.current.width = width 
    largeCanvasInfo.current.height = height 
  }, [largeCanvasSize.width, largeCanvasSize.height, aspectRatio])

  const largeCanvasData = useRef({})
  const setLargeCanvasData = (camera, scene, gl) => {
    largeCanvasData.current.camera = camera
    largeCanvasData.current.scene = scene
    largeCanvasData.current.gl = gl
  }

  const smallCanvasData = useRef({})
  const setSmallCanvasData = (camera, scene, gl) => {
    smallCanvasData.current.camera = camera
    smallCanvasData.current.scene = scene
    smallCanvasData.current.gl = gl
  }


  useExportToGltf(largeCanvasData.current.scene)

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
                gl2={true}
                /* onPointerDown={ onCanvasPointerDown } */
                orthographic={ true }
                updateDefaultCamera={ false }>
                <Provider store={ store }>
                  <SceneManagerR3fSmall
                    renderData={ mainViewCamera === "live" ? null : largeCanvasData.current }
                    setSmallCanvasData={ setSmallCanvasData }
                    />
                </Provider>
                <Effect renderData={ mainViewCamera === "live" ? null : largeCanvasData.current }/>
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
            <div id="camera-view" ref={ mainViewContainerRef }>
              <div id="camera-view-view" style={{ width: largeCanvasInfo.current.width, height: largeCanvasInfo.current.height }}>
                  <Canvas
                  tabIndex={ 1 }
                  key="camera-canvas"
                  id="camera-canvas"
                  gl2={true}
                  updateDefaultCamera={ true }>
                    <Provider store={ store }>
                      <SceneManagerR3fLarge
                      renderData={ mainViewCamera === "live" ? null : smallCanvasData.current }
                      setLargeCanvasData= { setLargeCanvasData }/>
                    </Provider>
                    <Effect renderData={ mainViewCamera === "live" ? null : smallCanvasData.current } />
                    
                  </Canvas>
                  <GuidesView
                    dimensions={guidesDimensions}
                  />
              </div>
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
