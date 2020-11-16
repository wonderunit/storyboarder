import React, { useState, useEffect, useRef, useMemo } from 'react'
import { Provider, connect, useSelector } from 'react-redux'
import { Canvas } from 'react-three-fiber'
import { useThree, useFrame } from 'react-three-fiber'
import ShotExplorerSceneManager from '../shot-explorer/ShotExplorerSceneManager'
import FatalErrorBoundary from '../shot-generator/components/FatalErrorBoundary'
import {OutlineEffect} from '../vendor/OutlineEffect'
import {cache} from '../shot-generator/hooks/use-assets-manager'
import TWEEN from '@tweenjs/tween.js'
import electron from 'electron'
import useSaveImage from './hooks/useSaveImage'
const { ipcRenderer } = electron
import { useDispatch } from 'react-redux'
import FilepathsContext from '../shot-generator/contexts/filepaths'
const {
  createUserPresetPathResolver,
  createAssetPathResolver
} = require('../shot-generator/services/filepaths')
const getUserPresetPath = createUserPresetPathResolver(electron.remote.app.getPath('userData'))
const defaultSize = 900
const Effect = ({ shouldRender, dispatch, aspectRatio}) => {
    const {gl, size} = useThree()
    const [newAssetsLoaded, setLoadedAssets] = useState()
    const outlineEffect = new OutlineEffect(gl, { defaultThickness: 0.015 })
    useEffect(() => void outlineEffect.setSize(size.width, size.height), [size])
    const updateAssets = () => {setLoadedAssets({})}

    useEffect(() => {
      let assets = Object.values(cache.get())
      for(let i = 0; i < assets.length; i++) {
        let asset = assets[i]
        if(asset.status !== 'SUCCESS') return
      }
      setTimeout(() => {
        ipcRenderer.send("headless-render:loaded")
      }, 0)
    }, [newAssetsLoaded, size])


    useEffect(() => {
      cache.subscribe(updateAssets)
      return () => {
          cache.unsubscribe(updateAssets)
      }
    }, [])
    
    const {saveImage} = useSaveImage(outlineEffect, dispatch)
    useEffect(() => {
      ipcRenderer.addListener('headless-render:save-shot', saveImage)
      return () => {
        ipcRenderer.removeListener('headless-render:save-shot', saveImage)
      }
    }, [saveImage])

    useFrame(({ gl, scene, camera }, time) => {
        if(!shouldRender) return
        TWEEN.update()
        outlineEffect.render(scene, camera)
    }, 1)
    
    return null
}

const HeadlessRender = React.memo(({
    aspectRatio,
    store,
    board,
}) => {

    const [sceneInfo, setSceneInfo] = useState(null)
    const dispatch = useDispatch()
    const storyboarderFilePath = useSelector(state => state.meta.storyboarderFilePath)
    const largeCanvasSize = {width: defaultSize, height: defaultSize}
    const [largeCanvasInfo, setLargeCanvasInfo] = useState({width: 0, height: 0})
    const setLargeCanvasData = (camera, scene, gl) => {
      setSceneInfo({camera, scene, gl}) 
    }

    useMemo(() => {
      if(!aspectRatio) return
      let width = Math.ceil(largeCanvasSize.width)
      // assign a target height, based on scene aspect ratio
      let height = Math.ceil(width / aspectRatio)
      
      if (height > largeCanvasSize.height) {
        height = Math.ceil(largeCanvasSize.height)
        width = Math.ceil(height * aspectRatio)
      }
      setLargeCanvasInfo({width, height})
    }, [largeCanvasSize.width, largeCanvasSize.height, aspectRatio])


    // FIXME
    // apparently, storyboarderFilePath is not immediately available,
    // so we wait to setup the resolvers until it has a value
    // and we also don't render anything until it is
    const filepathsState = useMemo(
      () => {
        if (storyboarderFilePath) {
          return {
            getAssetPath: createAssetPathResolver(window.__dirname, storyboarderFilePath),
            getUserPresetPath
          }
        }
      },
      [window.__dirname, storyboarderFilePath]
    )

    // padding for right side of canvas
    return storyboarderFilePath && (
      <FatalErrorBoundary key={ board.uid }>
          <div className="camera-view">
            <div className="camera-view-view" style={{width: largeCanvasInfo.width, height: largeCanvasInfo.height}}>
              <Canvas
                  tabIndex={ 1 }
                  key="camera-canvas"
                  id="camera-canvas"
                  gl2={true}
                  updateDefaultCamera={ true }
                  noEvents={ true }
                  className="three-canvas" 
                 
                  >
                  <Provider store={store}>
                    <FilepathsContext.Provider value={filepathsState}>
                      <ShotExplorerSceneManager
                                  setLargeCanvasData= { setLargeCanvasData }
                                  isPreview={ true }
                                  shouldRender={ true }
                                  />
                    </FilepathsContext.Provider>
                  </Provider>
                  <Effect shouldRender={ true }
                           dispatch={dispatch}
                           aspectRatio={aspectRatio}
                   /> 
              </Canvas>
             </div>
          </div>
      </FatalErrorBoundary>
    )
})

const withState = (fn) => (dispatch, getState) => fn(dispatch, getState())
export default connect(
(state) => ({
    mainViewCamera: state.mainViewCamera,
    aspectRatio: state.aspectRatio,
    board: state.board,
}), 
{
    withState,
})
(HeadlessRender)