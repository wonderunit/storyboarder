import React, { useState, useCallback, useRef, useEffect, useMemo, useLayoutEffect } from 'react'
import ShotMaker from './ShotMaker'
import { Provider, connect} from 'react-redux'
import { Canvas } from 'react-three-fiber'
import { useThree, useFrame } from 'react-three-fiber'
import ShotExplorerSceneManager from './ShotExplorerSceneManager'
import FatalErrorBoundary from '../shot-generator/components/FatalErrorBoundary'
import {OutlineEffect} from '../vendor/OutlineEffect'
import {useAsset, cleanUpCache, cache} from '../shot-generator/hooks/use-assets-manager'
import TWEEN from '@tweenjs/tween.js'
import electron from 'electron'
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
    key,
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
   // const [boardId, setUpdateSceneInfo] = useState(null)

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

/*     useEffect(() => {
        setSceneInfo(null)
        setUpdateSceneInfo({})
    }, [board.uid]) */
      
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
        electron.remote.getCurrentWindow().on("blur", hide)
        electron.remote.getCurrentWindow().on("focus", show)
        return () => {
            cache.unsubscribe(updateAssets)
            window.removeEventListener("beforeunload", stopUnload)
            electron.remote.getCurrentWindow().removeListener("blur", hide)
            electron.remote.getCurrentWindow().removeListener("focus", show)
        }
    }, [])

    // padding for right side of canvas
    let paddingToRight = 5
    return (
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
                    <ShotExplorerSceneManager
                                setLargeCanvasData= { setLargeCanvasData }
                                isPreview={ true }
                                shouldRender={ shouldRender }
                                />
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