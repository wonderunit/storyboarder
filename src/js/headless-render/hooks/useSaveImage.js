import * as THREE from 'three'
import { useThree } from 'react-three-fiber'

import { ipcRenderer } from 'electron'
import { 
    getSerializedState,
 } from '../../shared/reducers/shot-generator'
const setCameraAspectFromRendererSize = (renderer, camera) => {
    let size = renderer.getSize(new THREE.Vector2())
    camera.aspect = size.width / size.height
}

const renderShot = (renderer, scene, originalCamera, shotSize) => {
    let camera = originalCamera.clone()
  
    //camera.layers.set(SHOT_LAYERS)
  
    setCameraAspectFromRendererSize(renderer, camera)
    camera.updateProjectionMatrix()
    renderer.setSize(shotSize.width, shotSize.height)
    renderer.render(scene, camera)
    let shotImageDataUrl = renderer.domElement.toDataURL()
    return { shotImageDataUrl}
}

const useSaveImage = (renderer, dispatch) => {
    const { camera, scene } = useThree()
    
    const saveImage = () => (dispatch, getState) => {
        let state = getState()
        let aspectRatio = state.aspectRatio
        let shotSize = new THREE.Vector2(Math.ceil(aspectRatio * 900), 900)

        let {shotImageDataUrl} = renderShot(renderer, scene, camera, shotSize)
        let data = getSerializedState(state)
        let currentBoard = state.board
        let uid = currentBoard.uid

        ipcRenderer.send('saveShot', {
          uid,
          data,
          images: {
            camera: shotImageDataUrl
          }
        })

    }

    const saveCurrentShotCb = () => dispatch( saveImage())
    return {saveImage:saveCurrentShotCb}
      
}

export default useSaveImage;