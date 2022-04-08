
import { gltfLoader } from './gltfLoader'
import { objLoader } from './objLoader'
import { colladaLoader } from './colladaLoader'
import { fbxLoader } from './fbxLoader'
import { stlLoader } from './stlLoader'
import { tdsLoader } from './3dsLoader'
import { plyLoader } from './plyLoader'
import { rgbeLoader } from './rgbeLoader'
import { exrLoader } from './exrLoader'
import { textureLoader } from './textureLoader'
import { objectLoader } from './objectLoader'


const SGLoaders = {

    '.gltf': gltfLoader,
    '.glb': gltfLoader,
    '.obj': objLoader,
    '.dae': colladaLoader,
    '.fbx': fbxLoader,
    '.stl': stlLoader,
    '.3ds': tdsLoader,
    '.ply': plyLoader,
    '.json': objectLoader,

    '.hdr': rgbeLoader,
    '.exr': exrLoader,
    '.jpeg': textureLoader,
    '.jpg': textureLoader,
    '.png': textureLoader,

}


export default SGLoaders