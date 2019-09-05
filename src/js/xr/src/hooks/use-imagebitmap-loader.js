const THREE = require('three')
const { unstable_createResource } = require('../../vendor/react-cache')

const resource = unstable_createResource(
  file => new Promise(async res => new THREE.ImageBitmapLoader().load(file, res))
)

const useImageBitmapLoader = filepath => resource.read(filepath)

module.exports = {
  useImageBitmapLoader,
  imageBitmapLoaderResource: resource
}
