import React, { useEffect, useRef, useMemo, useCallback, useState } from 'react'
import { Provider, connect} from 'react-redux'
import path from 'path'
import TWEEN from '@tweenjs/tween.js'
import {updateObjects, getObject } from '../../../windows/shot-generator/settings'
import electron from 'electron'
const { ipcRenderer, webFrame } = electron
import KeyHandler from './../KeyHandler'
import CameraPanelInspector from './../CameraPanelInspector'
import CamerasInspector from './../CamerasInspector'
import SceneManagerR3fLarge from '../../SceneManagerR3fLarge'
import SceneManagerR3fSmall from '../../SceneManagerR3fSmall'
import Toolbar from './../Toolbar'
import FatalErrorBoundary from './../FatalErrorBoundary'

import { useExportToGltf } from '../../../hooks/use-export-to-gltf'

import useComponentSize from './../../../hooks/use-component-size'

import { Canvas, useFrame, useThree } from 'react-three-fiber'

import BonesHelper from '../../../xr/src/three/BonesHelper'
import {
  selectObject,
  setMainViewCamera,
  getIsSceneDirty
} from './../../../shared/reducers/shot-generator'

import notifications from './../../../window/notifications'
import Icon from '../Icon'
import MenuManager from '../MenuManager'
import ElementsPanel from '../ElementsPanel'
import BoardInspector from '../BoardInspector'
import GuidesInspector from '../GuidesInspector'
import GuidesView from '../GuidesView'
import {useAsset, cleanUpCache} from '../../hooks/use-assets-manager'


import {OutlineEffect} from './../../../vendor/OutlineEffect'
import Stats from 'stats.js'
const maxZoom = {in: 0.4, out: -1.6}
const Effect = ({renderData, stats}) => {
  const {gl, size} = useThree()

  const outlineEffect = new OutlineEffect(gl, { defaultThickness: 0.015 })
  
  useEffect(() => void outlineEffect.setSize(size.width, size.height), [size])
  useFrame(({ scene, camera }) => {
    if(stats) stats.begin()
    TWEEN.update()
    if(renderData) {
      outlineEffect.render(renderData.scene, renderData.camera)
    } else {
      outlineEffect.render(scene, camera)
    }
    if(stats) stats.end()
  }, 1)
  
  return null
}
const Editor = React.memo(({
  mainViewCamera, aspectRatio, board, setMainViewCamera, withState, store, onBeforeUnload
}) => {
  if (!board.uid) {
    return null
  }
  
  const notificationsRef = useRef(null)
  const mainViewContainerRef = useRef(null)
  const [stats, setStats] = useState()
  const largeCanvasSize = useComponentSize(mainViewContainerRef)
  const [largeCanvasInfo, setLargeCanvasInfo] = useState({width: 0, height: 0})
  const toggleStats = (event, value) => {
    if (!stats) {
      let newStats
      newStats = new Stats()
      newStats.showPanel(0)
      document.body.appendChild( newStats.dom )
      newStats.dom.style.top = "7px"
      newStats.dom.style.left = "460px"
      setStats(newStats)
    } else {
      document.body.removeChild( stats.dom )
      setStats(undefined)
      }
  }

  const zoom = useCallback((event, value) => {
    let zoomLevel = webFrame.getZoomLevel()
    let zoom = zoomLevel + value 
    zoom = zoom >= maxZoom.in ? maxZoom.in : zoom <= maxZoom.out ? maxZoom.out : zoom
    webFrame.setZoomLevel(zoom)
    updateObjects({zoom})
  }, [])

  const setZoom = useCallback((event, value) => {
    let zoom = value >= maxZoom.in ? maxZoom.in : value <= maxZoom.out ? maxZoom.out : value
    webFrame.setZoomLevel(zoom)
    updateObjects({zoom})
  }, [])

  useEffect(() => {
    webFrame.setLayoutZoomLevelLimits(maxZoom.out, maxZoom.in)
    let currentWindow = electron.remote.getCurrentWindow()
    let settingsZoom = getObject("zoom")
    if(!settingsZoom && currentWindow.getBounds().height < 800) {
      webFrame.setZoomLevel(maxZoom.out)
    } else {
      webFrame.setZoomLevel(settingsZoom)
    }
    ipcRenderer.on('shot-generator:menu:view:fps-meter', toggleStats)
    ipcRenderer.on('shot-generator:menu:view:zoom', zoom)
    ipcRenderer.on('shot-generator:menu:view:setZoom', setZoom)
    return () => {
      ipcRenderer.off('shot-generator:menu:view:fps-meter', toggleStats)
      ipcRenderer.off('shot-generator:menu:view:zoom', zoom)
      ipcRenderer.off('shot-generator:menu:view:setZoom', setZoom)
    }
  }, [])

  /** Resources loading end */
  useEffect(() => {
    if (notificationsRef.current) {
      notifications.init(notificationsRef.current, true)
    }
  }, [notificationsRef.current])

  useEffect(() => {
    window.addEventListener('beforeunload', onBeforeUnload)
    return function cleanup () {
      window.removeEventListener('beforeunload', onBeforeUnload)
    }
  }, [onBeforeUnload])

  const guidesDimensions = useMemo(() => {
    return {
      width: Math.ceil((largeCanvasSize.width || window.innerWidth)),
      height: Math.ceil((largeCanvasSize.width  || window.innerWidth) / aspectRatio)
    }
  }, [largeCanvasSize.width, largeCanvasSize.height, aspectRatio])

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
    setLargeCanvasInfo({width, height})
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

  useExportToGltf(largeCanvasData.current.scene, withState)
  
  return (
    <FatalErrorBoundary key={board.uid}>
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
                orthographic={ true }
                updateDefaultCamera={ false }
                noEvents={ true }>
                <Provider store={ store }>
                  <SceneManagerR3fSmall
                    renderData={ mainViewCamera === "live" ? null : largeCanvasData.current }
                    mainRenderData={ mainViewCamera === "live" ? largeCanvasData.current : smallCanvasData.current }
                    setSmallCanvasData={ setSmallCanvasData }
                    />
                </Provider>
                <Effect renderData={ mainViewCamera === "live" ? null : largeCanvasData.current }/>
              </Canvas>
              <div className="topdown__controls">
                <div className="row"/>
                <div className="row">
                  <a href="#" onClick={onSwapCameraViewsClick}>
                    <Icon src="icon-camera-view-expand"/>
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
              <div id="camera-view-view" style={{ width: largeCanvasInfo.width, height: largeCanvasInfo.height }}>
                  <Canvas
                  tabIndex={ 1 }
                  key="camera-canvas"
                  id="camera-canvas"
                  gl2={true}
                  updateDefaultCamera={ true }
                  noEvents={ true }>
                    <Provider store={ store }>
                      <SceneManagerR3fLarge
                        renderData={ mainViewCamera === "live" ? null : smallCanvasData.current }
                        setLargeCanvasData= { setLargeCanvasData }/>
                    </Provider>
                    <Effect renderData={ mainViewCamera === "live" ? null : smallCanvasData.current }
                          stats={ stats } />
                    
                  </Canvas>
                  <GuidesView
                    dimensions={guidesDimensions}
                  />
              </div>
            </div>
            <div className="inspectors">
              <CameraPanelInspector/>
              <BoardInspector/>
              <div style={{ flex: "1 1 auto" }}>
                <CamerasInspector/>
                <GuidesInspector/>
              </div>
            </div>
          </div>
        </div>
      </div>
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
export default connect(
  (state) => ({
    mainViewCamera: state.mainViewCamera,
    aspectRatio: state.aspectRatio,
    board: state.board
  }),
  {
    withState,
    setMainViewCamera,
    selectObject,
    onBeforeUnload: event => (dispatch, getState) => {
      if (getIsSceneDirty(getState())) {
        // pass electron-specific flag
        // to trigger `will-prevent-unload` on BrowserWindow
        event.returnValue = false
      }
    },
  }
)(Editor)
