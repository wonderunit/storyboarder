import { useThree } from 'react-three-fiber'

const useImageRenderer = () => {
  const { scene, camera, gl } = useThree()

  const imageRenderer = ({ renderer, isPlot, aspectRatio }) => {
    let imageRenderCamera = camera.clone()

    if (isPlot) {
      aspectRatio = 1
      imageRenderCamera.left = imageRenderCamera.bottom
      imageRenderCamera.right = imageRenderCamera.top
    } else {
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
