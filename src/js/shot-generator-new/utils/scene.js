
const scene = {
  current: null
}

export const createScene = () => {
  scene.current = new THREE.Scene()
}

export const removeScene = () => {
  if (scene.current) {
    scene.current.dispose()
    scene.current = null
  }
}

export const getScene = () => {
  return scene.current
}