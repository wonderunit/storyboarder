import React, { useState, useEffect, useLayoutEffect, useMemo } from 'react'
import ShotMaker from './ShotMaker'
import { Provider, connect, useSelector } from 'react-redux'
import { Canvas } from 'react-three-fiber'
import { useThree, useFrame } from 'react-three-fiber'
import ShotExplorerSceneManager from './ShotExplorerSceneManager'
import FatalErrorBoundary from '../shot-generator/components/FatalErrorBoundary'
import {OutlineEffect} from '../vendor/OutlineEffect'
import {cache} from '../shot-generator/hooks/use-assets-manager'
import TWEEN from '@tweenjs/tween.js'
const remote = require('@electron/remote')

import FilepathsContext from '../shot-generator/contexts/filepaths'
const {
  createUserPresetPathResolver,
  createAssetPathResolver
} = require('../shot-generator/services/filepaths')
const getUserPresetPath = createUserPresetPathResolver(remote.app.getPath('userData'))

const Effect = ({ shouldRender }) => {
    const {gl, size} = useThree()
  
    const outlineEffect = new OutlineEffect(gl, { defaultThickness: 0.015 })
    
    useEffect(() => void outlineEffect.setSize(size.width, size.height), [size])
    useFrame(({ gl, scene, camera }, time) => {
        if(!shouldRender) return
        TWEEN.update()
        outlineEffect.render(scene, camera)
    }, 1)
    
    return null
}

const ShotExplorer = React.memo(({
    withState,
    aspectRatio,
    store,
    elementKey,
    canvasHeight,
    board
}) => {
    const [sceneInfo, setSceneInfo] = useState(null)
    const [newAssetsLoaded, setLoadedAssets] = useState()
    const [shouldRender, setShouldRender] = useState(false)

    const storyboarderFilePath = useSelector(state => state.meta.storyboarderFilePath)

    const stopUnload = (event) => {
        event.returnValue = false
    }
    const setLargeCanvasData = (camera, scene, gl) => {
        setSceneInfo({camera, scene, gl})
    }

    const [windowWidth, setWindowWidth] = useState(window.innerWidth)
    const handleResize = () => {
        setWindowWidth(window.innerWidth)
    }
      
    const show = () => setShouldRender(true) 
    const hide = () => setShouldRender(false) 
    
    useLayoutEffect(() => {
      window.addEventListener('resize', handleResize)
      return () => {
        window.removeEventListener('resize', handleResize) 
      }
    }, [])

    const updateAssets = () => {setLoadedAssets({})}

    useEffect(() => {
        cache.subscribe(updateAssets)
        window.addEventListener("beforeunload", stopUnload)
        remote.getCurrentWindow().on("blur", hide)
        remote.getCurrentWindow().on("focus", show)
        return () => {
            cache.unsubscribe(updateAssets)
            window.removeEventListener("beforeunload", stopUnload)
            remote.getCurrentWindow().removeListener("blur", hide)
            remote.getCurrentWindow().removeListener("focus", show)
        }
    }, [])

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
    let paddingToRight = 5
    return storyboarderFilePath && (
      <FatalErrorBoundary key={ board.uid }>
          <div className="shot-explorer-shot-preview" style={{ width: windowWidth }}>
              <Canvas
                  tabIndex={ 1 }
                  key="camera-canvas"
                  id="camera-canvas"
                  gl2={true}
                  updateDefaultCamera={ true }
                  noEvents={ true }
                  className="three-canvas" 
                  style={{ width: (canvasHeight - paddingToRight ) * aspectRatio, height: canvasHeight - paddingToRight, userSelect: "none" }}
                  >
                  <Provider store={store}>
                    <FilepathsContext.Provider value={filepathsState}>
                      <ShotExplorerSceneManager
                                  setLargeCanvasData= { setLargeCanvasData }
                                  isPreview={ true }
                                  shouldRender={ shouldRender }
                                  />
                    </FilepathsContext.Provider>
                  </Provider>
                  <Effect shouldRender={ shouldRender }/> 
              </Canvas>
          </div>
          {sceneInfo && <ShotMaker key={ elementKey }
                      sceneInfo={ sceneInfo } 
                      withState={ withState }
                      aspectRatio={ aspectRatio }
                      newAssetsLoaded={ newAssetsLoaded }
                      canvasHeight={ canvasHeight }
                      elementKey={ elementKey }/> 
      }
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
(ShotExplorer)