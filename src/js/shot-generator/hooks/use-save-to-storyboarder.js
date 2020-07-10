import { useRef, useEffect, useCallback } from 'react'
import { useDispatch } from 'react-redux'
import { ipcRenderer } from 'electron'

import { OutlineEffect } from '../../vendor/OutlineEffect'
import { 
    getSerializedState,

    selectObject,
    markSaved
 } from '../../shared/reducers/shot-generator'
import createShadingEffect from '../../vendor/shading-effects/createShadingEffect'

const renderAll = ({ renderer, renderLargeView, renderSmallView }, { state }) => {
  let { aspectRatio } = state

  let shotImageDataUrl = renderLargeView({ renderer, isCameraPlot: false, aspectRatio })
  let cameraPlotImageDataUrl = renderSmallView({ renderer, isCameraPlot: true, aspectRatio: 1 })

  return {
    shotImageDataUrl,
    cameraPlotImageDataUrl
  }
}

const saveCurrentShot = ({ renderLargeView, renderSmallView, renderer }) => (dispatch, getState) => {
  let state = getState()

  // de-select objects so they don't show in the saved image
  dispatch(selectObject(null))

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
  let state = getState()

  // de-select objects so they don't show in the saved image
  dispatch(selectObject(null))

  // HACK slight delay to allow for re-render after the above changes
  setTimeout(() => {
    // mark as saved, to avoid a prompt that the scene is dirty when the scene reloads
    dispatch(markSaved())

    const { shotImageDataUrl, cameraPlotImageDataUrl } = renderAll(
      { renderLargeView, renderSmallView, renderer },
      { state }
    )

    let data = getSerializedState(state)
    let currentBoard = state.board

    ipcRenderer.send('insertShot', {
      data,
      currentBoard,
      images: {
        camera: shotImageDataUrl,
        plot: cameraPlotImageDataUrl
      }
    })
  }, 0)
}

const useSaveToStoryboarder = (largeRenderFnRef, smallRenderFnRef, shadingMode) => {
  const dispatch = useDispatch()

  // one shared OutlineEffect and one WebGLRenderer are used for all image file rendering
  const outlineEffect = useRef()
  const imageRenderer = useRef()
  useEffect(() => {
    if (!imageRenderer.current) {
      imageRenderer.current = new THREE.WebGLRenderer({ antialias: true }), { defaultThickness:0.008 }
    }
    return () => {
      imageRenderer.current = null
      outlineEffect.current = null
    }
  }, [])

  useEffect(() => {
    outlineEffect.current = createShadingEffect(shadingMode, imageRenderer.current)
    return () => {
        outlineEffect.current = null
    }
  }, [shadingMode])

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
