import React, { useRef, useEffect, useCallback } from 'react'
import { connect } from 'react-redux'
import { 
    getSelections,
    getSerializedState,
    updateObject,
    markSaved,
    selectObject,
    getSceneObjects
 } from '../../../shared/reducers/shot-generator'
 import { ipcRenderer } from 'electron'
import { useThree } from 'react-three-fiber'
import { SHOT_LAYERS } from '../../utils/ShotLayers'
import { OutlineEffect } from '../../../vendor/OutlineEffect'
import { remote } from 'electron'
import path from 'path'
import fs from 'fs-extra'

const { dialog } = remote
const withState = (fn) => (dispatch, getState) => fn(dispatch, getState())

const SaveShot = connect(
    state => ({
        storyboarderFilePath : state.meta.storyboarderFilePath
    }),
    {
        getSelections,
        getSerializedState,
        withState,
        markSaved,
        selectObject,
        updateObject,
        saveScene: filepath => (dispatch, getState) => {
            let state = getState()
            let contents = getSerializedState(state)
            fs.writeFileSync(filepath, JSON.stringify(contents, null, 2))
            dialog.showMessageBox(null, { message: 'Saved!' })
          },
    })
( React.memo(({
    withState,
    storyboarderFilePath,
    markSaved,
    isPlot = false,
    selectObject,
    updateObject
}) => {
    const { scene, camera } = useThree()
    const imageRenderer = useRef()
    const outlineEffect = useRef()

    useEffect(() => {
        if (!imageRenderer.current) {
            imageRenderer.current = new THREE.WebGLRenderer({ antialias: true }), { defaultThickness:0.008 }
        }
        outlineEffect.current = new OutlineEffect(imageRenderer.current, { defaultThickness: 0.015 })
        return () => {
            imageRenderer.current = null
            outlineEffect.current = null
        }
    }, [])

    const saveShot = () => {
        saveImages()
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
        saveImages()
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

    const saveImages = () => {
        let imageObjects 
        withState((dispatch, state) => {
            imageObjects = Object.values(getSceneObjects(state)).filter(obj => obj.type === "image")
        })
        for( let i = 0; i < imageObjects.length; i++ ) {
            let image = imageObjects[i]
            let tempImageFilePath = path.join(path.dirname(storyboarderFilePath), 'models/images', `temp_${image.id}-texture.png`)
            let imageFilePath = path.join(path.dirname(storyboarderFilePath), 'models/images', `${image.id}-texture.png`)
  
            let isImageExist = fs.pathExistsSync(tempImageFilePath)
            if(!isImageExist) continue
            fs.rename(tempImageFilePath, imageFilePath)
            let projectDir = path.dirname(storyboarderFilePath)
            let assetsDir = path.join(projectDir, 'models', 'images')
            fs.ensureDirSync(assetsDir)
            let dst = path.join(assetsDir, path.basename(imageFilePath))
            let id = path.relative(projectDir, dst)
            if(!image.imageAttachmentIds || !image.imageAttachmentIds.find(ids => ids === id)) {
              updateObject(image.id, {imageAttachmentIds: [id]})
            }
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
