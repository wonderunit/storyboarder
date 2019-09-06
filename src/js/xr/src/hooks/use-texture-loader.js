const THREE = require('three')
const { unstable_createResource } = require('../../vendor/react-cache')

const resource = unstable_createResource(
  file => new Promise(async res => new THREE.TextureLoader().load(file, res))
)

const useTextureLoader = filepath => resource.read(filepath)

module.exports = useTextureLoader
