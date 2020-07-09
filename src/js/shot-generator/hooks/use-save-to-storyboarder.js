import { useRef, useEffect, useCallback } from 'react'
import { useDispatch } from 'react-redux'
import fs from 'fs-extra'
import os from 'os'
import path from 'path'
import { ipcRenderer } from 'electron'

import { OutlineEffect } from '../../vendor/OutlineEffect'
import { 
    getSerializedState,

    selectObject,
    setMainViewCamera,
    markSaved
 } from '../../shared/reducers/shot-generator'

const stripPrefix = dataURL => dataURL.replace(/^data:image\/\w+;base64,/, '')

const saveDataURLtoFile = (imageData, filepath) =>
  fs.writeFileSync(filepath, imageData, 'base64')

const renderAll = ({ renderer, renderLargeView, renderSmallView }, { state }) => {
  let { aspectRatio, mainViewCamera } = state
  let shotImageDataUrl = renderLargeView({ renderer, isPlot: false, aspectRatio })
  let cameraPlotImageDataUrl = renderSmallView({ renderer, isPlot: true, aspectRatio })

  return {
    shotImageDataUrl,
    cameraPlotImageDataUrl
  }
}

// const createTemporaryDirectory = () => fs.mkdtempSync(path.join(os.tmpdir(), 'storyboarder-'))

// const getFilePaths = dirpath => ({
//   shotGenerator: path.join(dirpath, 'shot-generator.png'),
//   cameraPlot: path.join(dirpath, 'camera-plot.png')
// })

const saveCurrentShot = ({ renderLargeView, renderSmallView, renderer }) => (dispatch, getState) => {
  console.log('saveCurrentShot')

  let state = getState()

  dispatch(selectObject(null))

  // HACK force update the view sizes, to guarantee camera plot aspect ratio will be 1:1
  dispatch(setMainViewCamera('live'))

  // HACK slight delay to allow for re-render after the above changes
  setTimeout(() => {
    const { shotImageDataUrl, cameraPlotImageDataUrl } = renderAll(
      { renderLargeView, renderSmallView, renderer },
      { state }
    )


    let data = getSerializedState(state)
    let currentBoard = state.board
    let uid = currentBoard.uid

    ipcRenderer.send('saveShot', {
      uid,
      data,
      images: {
        camera: shotImageDataUrl,
        plot: cameraPlotImageDataUrl
      }
    })

    dispatch(markSaved())
    }, 0)
}

const insertNewShot = ({ renderLargeView, renderSmallView, renderer }) => (dispatch, getState) => {
  console.log('insertNewShot') 
    // TODO !!!!!!!
}

const useSaveToStoryboarder = (largeRenderFnRef, smallRenderFnRef) => {
  const dispatch = useDispatch()

  // one shared OutlineEffect and one WebGLRenderer are used for all image file rendering
  const outlineEffect = useRef()
  useEffect(() => {
    let imageRenderer
    if (!outlineEffect.current) {
      imageRenderer = new THREE.WebGLRenderer({ antialias: true }), { defaultThickness:0.008 }
      outlineEffect.current = new OutlineEffect(imageRenderer, { defaultThickness: 0.015 })
    }
    return () => {
      imageRenderer = null
      outlineEffect.current = null
    }
  }, [])
  const saveCurrentShotCb = useCallback(
    () => dispatch(
      saveCurrentShot({
        renderer: outlineEffect.current,
        renderLargeView: largeRenderFnRef.current,
        renderSmallView: smallRenderFnRef.current
      })
    ),
    [outlineEffect.current, largeRenderFnRef.current, smallRenderFnRef.current]
  )

  const insertNewShotCb = useCallback(
    () => dispatch(
      insertNewShot({
        renderer: outlineEffect.current,
        renderLargeView: largeRenderFnRef.current,
        renderSmallView: smallRenderFnRef.current
      })
    ),
    [outlineEffect.current, largeRenderFnRef.current, smallRenderFnRef.current]
  )

  return {
    saveCurrentShot: saveCurrentShotCb,
    insertNewShot: insertNewShotCb
  }
}

export default useSaveToStoryboarder
