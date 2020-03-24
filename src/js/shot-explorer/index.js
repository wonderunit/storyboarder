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
import {
   updateObject
  } from '../shared/reducers/shot-generator'
  import CameraUpdate from '../shot-generator/CameraUpdate'
const Effect = ({}) => {
    const {gl, size} = useThree()
  
    const outlineEffect = new OutlineEffect(gl, { defaultThickness: 0.015 })
    
    useEffect(() => void outlineEffect.setSize(size.width, size.height), [size])
    useFrame(({ gl, scene, camera }, time) => {
        TWEEN.update()
        outlineEffect.render(scene, camera)
    }, 1)
    
    return null
  }
const stopUnload = (event) => {

    event.returnValue = false
}

const ShotExplorer = React.memo(({
    key,
    withState,
    aspectRatio,
    updateObject,
    store,
    elementKey,
    defaultWidth
}) => {
    const [sceneInfo, setSceneInfo] = useState(null)
    const [newAssetsLoaded, setLoadedAssets] = useState()
    const setLargeCanvasData = (camera, scene, gl) => {
        setSceneInfo({camera, scene, gl})
    }

    const updateAssets = () => {setLoadedAssets({})}

    useEffect(() => {
        console.log("Mount")
        cache.subscribe(updateAssets)
        window.addEventListener("beforeunload", stopUnload)
        return () => {
            console.log("Unmount")
            cache.unsubscribe(updateAssets)
            window.removeEventListener("beforeunload", stopUnload)
        }
    }, [])

    console.log(cache.get()); 
    // padding for right side of canvas
    let paddingToRight = 10 * aspectRatio
    return (
    <FatalErrorBoundary>
        <Canvas
            tabIndex={ 1 }
            key="camera-canvas"
            id="camera-canvas"
            gl2={true}
            updateDefaultCamera={ true }
            noEvents={ true }
            className="shot-explorer-shot-selected" 
            style={{ width: (defaultWidth * aspectRatio) - paddingToRight, height: 900 / 2, paddingTop: "20px" }}>
            <Provider store={store}>
                <ShotExplorerSceneManager
                            setLargeCanvasData= { setLargeCanvasData }
                            isPreview={ true }/>
            </Provider>
            <Effect />
        </Canvas>
        <ShotMaker key={ elementKey }
                    sceneInfo={ sceneInfo } 
                    withState={ withState }
                    aspectRatio={ aspectRatio }
                    newAssetsLoaded={ newAssetsLoaded }
                    updateObject={ updateObject }
                    defaultWidth={ defaultWidth }/> 
    </FatalErrorBoundary>
    )
})

const withState = (fn) => (dispatch, getState) => fn(dispatch, getState())
export default connect(
(state) => ({
    mainViewCamera: state.mainViewCamera,
    aspectRatio: state.aspectRatio
}), 
{
    withState,
    updateObject
})
(ShotExplorer)