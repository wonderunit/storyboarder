const { unstable_createResource } = require('../../vendor/react-cache')
const { GLTFLoader } = require('three/examples/jsm/loaders/GLTFLoader')

const resource = unstable_createResource(
  file => new Promise(async res => new GLTFLoader().load(file, res))
)

const useGltf = filepath => resource.read(filepath)

module.exports = useGltf
