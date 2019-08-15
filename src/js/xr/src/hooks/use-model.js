const { useMemo } = require('react')
const { unstable_createResource } = require('../../vendor/react-cache')
const { GLTFLoader } = require('three/examples/jsm/loaders/GLTFLoader')

const resource = unstable_createResource(file => new Promise(async res => new GLTFLoader().load(file, res)))

const useModel = file => {
  const { scene } = resource.read(file)
  const geom = useMemo(() => {
    const temp = []
    scene.traverse(child => child.isMesh && temp.push(child.geometry))
    return temp
  }, [scene])
  return [geom, scene.children[0].position]
}

module.exports = useModel
