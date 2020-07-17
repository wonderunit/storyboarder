import React, { useState, useEffect, useLayoutEffect, useRef } from 'react'
import ShotMaker from './ShotMaker'
import { Provider, connect} from 'react-redux'
import { Canvas } from 'react-three-fiber'
import { useThree, useFrame } from 'react-three-fiber'
import ShotExplorerSceneManager from './ShotExplorerSceneManager'
import FatalErrorBoundary from '../shot-generator/components/FatalErrorBoundary'
import {OutlineEffect} from '../vendor/OutlineEffect'
import { getSceneObjects } from '../shared/reducers/shot-generator'
import TWEEN from '@tweenjs/tween.js'
import electron from 'electron'
import deepEqualSelector from '../utils/deepEqualSelector'
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

const sceneObjectSelector = (state) => {
    const sceneObjects = getSceneObjects(state)
  
    let newSceneObjects = {}
    let keys = Object.keys(sceneObjects)
    for(let i = 0; i < keys.length; i++) {
      let key = keys[i]
      if(sceneObjects[key].type !== "camera")
        newSceneObjects[key] = sceneObjects[key]
    }
    return newSceneObjects
}
  
const getSceneObjectsM = deepEqualSelector([sceneObjectSelector], (sceneObjects) => sceneObjects)

const ShotExplorer = React.memo(({
    withState,
    aspectRatio,
    store,
    elementKey,
    canvasHeight,
    board,
    sceneObjects
}) => {
    const sceneInfo = useRef()
    const [shouldRender, setShouldRender] = useState(false)
    const stopUnload = (event) => {
        event.returnValue = false
    }
    const setLargeCanvasData = (camera, scene, gl) => {
        sceneInfo.current = {}
        sceneInfo.current.camera = camera
        sceneInfo.current.scene = scene
        sceneInfo.current.gl = gl
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

    useEffect(() => {
        window.addEventListener("beforeunload", stopUnload)
        electron.remote.getCurrentWindow().on("blur", hide)
        electron.remote.getCurrentWindow().on("focus", show)
        return () => {
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
        <ShotMaker key={ elementKey }
                    sceneInfo={ sceneInfo.current } 
                    withState={ withState }
                    aspectRatio={ aspectRatio }
                    canvasHeight={ canvasHeight }
                    elementKey={ elementKey }
                    sceneObjects={sceneObjects}/> 
    </FatalErrorBoundary>
    )
})

const withState = (fn) => (dispatch, getState) => fn(dispatch, getState())
export default connect(
(state) => ({
    mainViewCamera: state.mainViewCamera,
    aspectRatio: state.aspectRatio,
    board: state.board,
    sceneObjects: getSceneObjectsM(state)
}), 
{
    withState,
})
(ShotExplorer)