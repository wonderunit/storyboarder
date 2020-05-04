import React, { useRef, useEffect, useCallback } from 'react'
import { connect } from 'react-redux'
import { 
    getSelections,
    getSerializedState,
    markSaved,
    selectObject
 } from '../../../shared/reducers/shot-generator'
 import { ipcRenderer } from 'electron'
import { useThree } from 'react-three-fiber'
import { SHOT_LAYERS } from '../../utils/ShotLayers'
import { OutlineEffect } from '../../../vendor/OutlineEffect'
import { remote } from 'electron'
import { ShadingType } from '../../../vendor/shading-effects/ShadingType'
import WireframeShading from '../../../vendor/shading-effects/WireframeShading'
import FlatShading from '../../../vendor/shading-effects/FlatShading'

const { dialog } = remote
const withState = (fn) => (dispatch, getState) => fn(dispatch, getState())

const SaveShot = connect(
    state => ({
        shadingMode: state.shaderMode
    }),
    {
        getSelections,
        getSerializedState,
        withState,
        markSaved,
        selectObject,
        saveScene: filepath => (dispatch, getState) => {
            let state = getState()
            let contents = getSerializedState(state)
            fs.writeFileSync(filepath, JSON.stringify(contents, null, 2))
            dialog.showMessageBox(null, { message: 'Saved!' })
          },
    })
( React.memo(({
    withState,
    markSaved,
    isPlot = false,
    selectObject,
    shadingMode
}) => {
    const { scene, camera } = useThree()
    const imageRenderer = useRef()
    const outlineEffect = useRef()
    
    useEffect(() => {
        if (!imageRenderer.current) {
            imageRenderer.current = new THREE.WebGLRenderer({ antialias: true }), { defaultThickness:0.008 }
        }
        return () => {
            imageRenderer.current = null
        }
    }, [])

    useEffect(() => {
        console.log(imageRenderer.current)
        switch(shadingMode) {
            case ShadingType.Wireframe:
                outlineEffect.current = new WireframeShading(imageRenderer.current)
                break
            case ShadingType.Flat:
                outlineEffect.current = new FlatShading(imageRenderer.current)
                break
            case ShadingType.Outline:
            default:
                outlineEffect.current = new OutlineEffect(imageRenderer.current, { defaultThickness: 0.015 })
                break
        }
        console.log( outlineEffect.current)
        return () => {
            outlineEffect.current = null
        }
    }, [shadingMode])

    const saveShot = () => {
        selectObject(null)
        if(!isPlot) {
            withState((dispatch, state) => {
                let cameraImage = renderImagesForBoard(dispatch, state)
                ipcRenderer.send('saveShot', {
                  uid: state.board.uid,
                  data: getSerializedState(state),
                  images: {
                    'camera': cameraImage,
                  }
                })
            
                dispatch(markSaved())
            })
        } else {
            let plotImage = renderImagesForBoard()
            withState((dispatch, state) => {
                ipcRenderer.send('saveShotPlot', {
                    plotImage: plotImage,
                    currentBoard: state.board.uid 
                })
            })
        }
    }
  
    const insertShot = useCallback(() => {
        selectObject(null)
        if(!isPlot) {
            withState((dispatch, state) => {
                let cameraImage = renderImagesForBoard(dispatch, state)
                // NOTE we do this first, since we get new data on insertShot complete
                markSaved()

                ipcRenderer.send('insertShot', {
                  data: getSerializedState(state),
                  images: {
                    camera: cameraImage
                  },
                  currentBoard: state.board
                })
        }) } else {
            let plotImage = renderImagesForBoard()
            setTimeout(() => {
                withState((dispatch, state) => {
                    ipcRenderer.send('saveShotPlot', {
                        plotImage: plotImage,
                        currentBoard: state.board.uid
                    })
                })
              }, 100)
     
        }
    }, [scene])
  
    // add handlers once, and use refs for callbacks
    useEffect(() => {
        ipcRenderer.on('requestSaveShot', saveShot)
        return () => ipcRenderer.removeListener('requestSaveShot', saveShot)
    }, [saveShot])

    useEffect(() => {
        ipcRenderer.on('requestInsertShot', insertShot)
        return () => ipcRenderer.removeListener('requestInsertShot', insertShot)
    }, [insertShot])
  
    const renderImagesForBoard = (dispatch, state) => {
        let width = isPlot ? 900 : Math.ceil(900 * state.aspectRatio)
        let imageRenderCamera = camera.clone()
        imageRenderCamera.layers.set(SHOT_LAYERS)
        // render the image

        let savedBackground  
        if(isPlot) {
            savedBackground = scene.background && scene.background.clone()
            scene.background = new THREE.Color( "#FFFFFF" )
        }
        outlineEffect.current.setSize(width, 900)
        outlineEffect.current.render(scene, imageRenderCamera)
        let cameraImage = outlineEffect.current.domElement.toDataURL()
        if(isPlot) { 
            scene.background = savedBackground
        }
            
        return cameraImage
    }

    return null
    })
)

export default SaveShot
