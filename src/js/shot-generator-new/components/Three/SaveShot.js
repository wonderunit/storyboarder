import React, { useRef, useEffect } from "react"
import { connect } from "react-redux"
import { 
    getSelections,
    getSerializedState,
    markSaved
 } from '../../../shared/reducers/shot-generator'
 import { ipcRenderer } from 'electron'
import { useThree } from 'react-three-fiber'
import { SHOT_LAYERS } from '../../utils/ShotLayers'
const withState = (fn) => (dispatch, getState) => fn(dispatch, getState())

const SaveShot = connect(
    state => ({
        selections: getSelections(state),
        data: getSerializedState(state)

    }),
    {
        getSelections,
        getSerializedState,
        withState,
        markSaved
    })
( React.memo(({
    withState,
    markSaved,
    data,
    isPlot = false
}) => {
    const { scene, camera } = useThree()
    const imageRenderer = useRef()

    const saveShot = () => {
        if(!isPlot) {
            withState((dispatch, state) => {
                let cameraImage = renderImagesForBoard(dispatch, state)
                ipcRenderer.send('saveShot', {
                  uid: state.board.uid,
                  data: data,
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
  
    const insertShot = () => {
        if(!isPlot) {
            withState((dispatch, state) => {
                let cameraImage = renderImagesForBoard(dispatch, state)

                // NOTE we do this first, since we get new data on insertShot complete
                dispatch(markSaved())

                ipcRenderer.send('insertShot', {
                  data: data,
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
    }
  
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
        if (!imageRenderer.current) {
          imageRenderer.current = new THREE.WebGLRenderer({ antialias: true }), { defaultThickness:0.008 }
        }
        let width = isPlot ? 900 : Math.ceil(900 * state.aspectRatio)
        let imageRenderCamera = camera.clone()
        imageRenderCamera.layers.set(SHOT_LAYERS)
        // render the image

        let savedBackground  
        if(isPlot) {
            savedBackground = scene.background && scene.background.clone()
            scene.background = new THREE.Color( "#FFFFFF" )
        }
        imageRenderer.current.setSize(width, 900)
        imageRenderer.current.render(scene, imageRenderCamera)
        let cameraImage = imageRenderer.current.domElement.toDataURL()
        if(isPlot) { 
            scene.background = savedBackground
        }
            
        return cameraImage
    }

    return null
    })
)

export default SaveShot
