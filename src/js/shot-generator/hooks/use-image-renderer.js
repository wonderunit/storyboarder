import { useThree } from 'react-three-fiber'

import { SHOT_LAYERS } from '../utils/ShotLayers'

const useImageRenderer = () => {
  const { scene, camera, gl } = useThree()

  const imageRenderer = ({ renderer, isCameraPlot, aspectRatio }) => {
    let imageRenderCamera = camera.clone()

    if (isCameraPlot) {
      aspectRatio = 1
      imageRenderCamera.left = imageRenderCamera.bottom
      imageRenderCamera.right = imageRenderCamera.top
    } else {
      imageRenderCamera.layers.set(SHOT_LAYERS)
      imageRenderCamera.aspect = aspectRatio
    }
    imageRenderCamera.updateProjectionMatrix()
    renderer.setSize(Math.ceil(aspectRatio * 900), 900)
    renderer.render(scene, imageRenderCamera)

    return renderer.domElement.toDataURL()
  }

  return imageRenderer
}

export default useImageRenderer
