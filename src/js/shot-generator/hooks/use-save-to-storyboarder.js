import { useRef, useEffect, useCallback, useMemo } from 'react'
import { useDispatch } from 'react-redux'
import { ipcRenderer } from 'electron'

import { 
  getSerializedState,
  getWorld,

  selectObject,
  markSaved,
} from '../../shared/reducers/shot-generator'
import { ShadingType } from '../../vendor/shading-effects/ShadingType'

import { SHOT_LAYERS } from '../utils/ShotLayers'
import useShadingEffect from '../hooks/use-shading-effect'

const renderAll = (
  shotRenderer, cameraPlotRenderer,
  largeCanvasData, smallCanvasData,
  shotSize, cameraPlotSize,
  aspectRatio
) => {
  shotRenderer.current.setSize(shotSize.width, shotSize.height)
  renderShot(
    shotRenderer.current,
    largeCanvasData.current.scene,
    largeCanvasData.current.camera,
    { size: shotSize, aspectRatio }
  )
  let shotImageDataUrl = shotRenderer.current.domElement.toDataURL()

  cameraPlotRenderer.current.setSize(cameraPlotSize.width, cameraPlotSize.height)
  renderCameraPlot(
    cameraPlotRenderer.current,
    smallCanvasData.current.scene,
    smallCanvasData.current.camera,
    { size: cameraPlotSize }
  )
  let cameraPlotImageDataUrl = cameraPlotRenderer.current.domElement.toDataURL()

  return {
    shotImageDataUrl,
    cameraPlotImageDataUrl
  }
}

const setCameraAspectFromRendererSize = (renderer, camera) => {
  let size = renderer.getSize(new THREE.Vector2())
  camera.aspect = size.width / size.height
}

const renderShot = (renderer, scene, originalCamera) => {
  let camera = originalCamera.clone()

  camera.layers.set(SHOT_LAYERS)

  setCameraAspectFromRendererSize(renderer, camera)
  camera.updateProjectionMatrix()

  renderer.render(scene, camera)
}

const renderCameraPlot = (renderer, scene, originalCamera) => {
  let camera = originalCamera.clone()

  camera.left = camera.bottom
  camera.right = camera.top

  setCameraAspectFromRendererSize(renderer, camera)
  camera.updateProjectionMatrix()

  renderer.render(scene, camera)
}

const saveCurrentShot = (shotRenderer, cameraPlotRenderer, largeCanvasData, smallCanvasData, shotSize, cameraPlotSize, aspectRatio) => (dispatch, getState) => {
  let state = getState()

  // de-select objects so they don't show in the saved image
  dispatch(selectObject(null))

  // HACK slight delay to allow for re-render after the above changes
  setTimeout(() => {
    const { shotImageDataUrl, cameraPlotImageDataUrl } = renderAll(
      shotRenderer, cameraPlotRenderer,
      largeCanvasData, smallCanvasData,
      shotSize, cameraPlotSize,
      aspectRatio
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

const insertNewShot = (shotRenderer, cameraPlotRenderer, largeCanvasData, smallCanvasData, shotSize, cameraPlotSize, aspectRatio) => (dispatch, getState) => {
  let state = getState()

  // de-select objects so they don't show in the saved image
  dispatch(selectObject(null))

  // HACK slight delay to allow for re-render after the above changes
  setTimeout(() => {
    // mark as saved, to avoid a prompt that the scene is dirty when the scene reloads
    dispatch(markSaved())

    const { shotImageDataUrl, cameraPlotImageDataUrl } = renderAll(
      shotRenderer, cameraPlotRenderer,
      largeCanvasData, smallCanvasData,
      shotSize, cameraPlotSize,
      aspectRatio
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

const useSaveToStoryboarder = (largeCanvasData, smallCanvasData, aspectRatio, shadingMode, backgroundColor) => {
  const dispatch = useDispatch()

  const imageRenderer = useRef()
  if (!imageRenderer.current) imageRenderer.current = new THREE.WebGLRenderer({ antialias: true })
  useEffect(() => {
    return () => {
      if (imageRenderer.current) imageRenderer.current = null
    }
  }, [])

  const shotSize = useMemo(() => new THREE.Vector2(Math.ceil(aspectRatio * 900), 900), [aspectRatio])
  const cameraPlotSize = useMemo(() => new THREE.Vector2(900, 900), [])

  const shotRenderer = useShadingEffect(imageRenderer.current, shadingMode, backgroundColor)
  const cameraPlotRenderer = useShadingEffect(imageRenderer.current, ShadingType.Outline, backgroundColor)

  const saveCurrentShotCb = useCallback(
    () => dispatch(
      saveCurrentShot(shotRenderer, cameraPlotRenderer, largeCanvasData, smallCanvasData, shotSize, cameraPlotSize, aspectRatio)
    ),
    []
  )

  const insertNewShotCb = useCallback(
    () => dispatch(
      insertNewShot(shotRenderer, cameraPlotRenderer, largeCanvasData, smallCanvasData, shotSize, cameraPlotSize, aspectRatio)
    ),
    []
  )

  return {
    saveCurrentShot: saveCurrentShotCb,
    insertNewShot: insertNewShotCb
  }
}

export default useSaveToStoryboarder
