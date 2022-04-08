import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader'
import {ColladaLoader} from 'three/examples/jsm/loaders/ColladaLoader'
import {OBJLoader} from 'three/examples/jsm/loaders/OBJLoader'
import {FBXLoader} from 'three/examples/jsm/loaders/FBXLoader'
import {STLLoader} from 'three/examples/jsm/loaders/STLLoader'
import { TDSLoader } from 'three/examples/jsm/loaders/TDSLoader'
import { PLYLoader } from 'three/examples/jsm/loaders/PLYLoader'
import { EXRLoader } from 'three/examples/jsm/loaders/EXRLoader'
import { RGBELoader} from 'three/examples/jsm/loaders/RGBELoader'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader'

export const onImageBufferLoad = (buffer, url) => {
  return new Promise((resolve, reject) => {
    // JPEGs can't have an alpha channel, so memory can be saved by storing them as RGB.
    const isJPEG = url.search( /\.jpe?g($|\?)/i ) > 0 || url.search( /^data\:image\/jpeg/ ) === 0

    let arrayBufferView = new Uint8Array( buffer )
    let blob = new Blob( [ arrayBufferView ], { type: isJPEG ? "image/jpeg" : "image/png" } )
    let urlCreator = window.URL || window.webkitURL
    let imageUrl = urlCreator.createObjectURL( blob )

    let image = new Image()
    image.onload = () => {
      const texture = new THREE.Texture()
      texture.image = image
  
      texture.format = isJPEG ? THREE.RGBFormat : THREE.RGBAFormat
      texture.needsUpdate = true
  
      resolve(texture)
    }
    image.src = imageUrl
  })
}

export const onBitmapImageBufferLoad = (url, buffer) => {
  return new Promise((resolve, reject) => {
    const isJPEG = url.search( /\.jpe?g($|\?)/i ) > 0 || url.search( /^data\:image\/jpeg/ ) === 0

    let arrayBufferView = new Uint8Array( buffer )
    let blob = new Blob( [ arrayBufferView ], { type: isJPEG ? "image/jpeg" : "image/png" } )

    let urlCreator = window.URL || window.webkitURL
    let imageUrl = urlCreator.createObjectURL( blob )

    let image = new Image()
    image.onload = () => {
      resolve(createImageBitmap(image))
    }
    image.onerror = reject

    image.src = imageUrl
  })
}

export const onAudioBufferLoad = (buffer) => {
  return new Promise((resolve, reject) => {
    //let arrayBufferView = new Uint8Array( buffer )
    let bufferCopy = buffer.slice( 0 );

    let context = THREE.AudioContext.getContext();
    context.decodeAudioData(bufferCopy, ( audioBuffer ) => {
      resolve( audioBuffer )
    })
  })
}

export const onGLTFBufferLoad = (buffer) => {
  return new Promise((resolve, reject) => {
    console.log('BUFFER', buffer)
    const loader = new GLTFLoader()
    const dracoLoader = new DRACOLoader()
    dracoLoader.setDecoderPath('./loaders/draco/') 
    loader.setDRACOLoader( dracoLoader )
    loader.parse(
      buffer,
      '',
      resolve,
      reject
    )
  })
}

export const onColladaBufferLoad = (buffer) => {
  return new Promise((resolve, reject) => {
    //ArrayBuffer to string
    const str = new TextDecoder().decode(buffer)
    //parse
    const loader = new ColladaLoader()
    resolve(loader.parse(str,''))
  })

}

export const onObjBufferLoad = (buffer) => {
  return new Promise((resolve, reject) => {
    //ArrayBuffer to string
    const str = new TextDecoder().decode(buffer)
    //parse
    const loader = new OBJLoader()
    resolve(loader.parse(str))
  })
}

export const onFbxBufferLoad = (buffer) => {
  return new Promise((resolve, reject) => {
    const loader = new FBXLoader()
    resolve(loader.parse(buffer,''))
  })
}

export const onStlBufferLoad = (buffer) => {
  return new Promise((resolve, reject) => {
    const loader = new STLLoader()
    resolve(loader.parse(buffer))
  })
}

export const on3dsBufferLoad = (buffer) => {
  return new Promise((resolve, reject) => {
    const loader = new TDSLoader()
    resolve(loader.parse(buffer,''))
  })
}

export const onPLYBufferLoad = (buffer) => {
  return new Promise((resolve, reject) => {
    const loader = new PLYLoader()
    resolve(loader.parse(buffer))
  })
}
export const onEXRImageBufferLoad = (buffer, url) => {
  return new Promise((resolve, reject) => {
    const loader = new EXRLoader()
    const data = loader.parse(buffer)
    const texture = new THREE.DataTexture(data.data,data.width,data.height,data.format,data.type)
    texture.needsUpdate = true
    resolve(texture)
  })
}

export const onHDRImageBufferLoad = (buffer, url) => {
  return new Promise((resolve, reject) => {
    const loader = new RGBELoader()
    const data = loader.parse(buffer)
    const texture = new THREE.DataTexture(data.data,data.width,data.height,data.format,data.type)
    texture.encoding = THREE.RGBEEncoding
    texture.flipY = true
    texture.needsUpdate = true
    resolve(texture)
  })
}

export const onObjectBufferLoad = (buffer, url) => {
  return new Promise((resolve, reject) => {
    const loader = new THREE.ObjectLoader()
    resolve(loader.parse(JSON.parse(new TextDecoder().decode(buffer))))
  })
}

export const XRBufferLoaders = {

  '.gltf': onGLTFBufferLoad,
  '.glb': onGLTFBufferLoad,
  '.obj': onObjBufferLoad,
  '.dae': onColladaBufferLoad,
  '.fbx': onFbxBufferLoad,
  '.stl': onStlBufferLoad,
  '.3ds': on3dsBufferLoad,
  '.ply': onPLYBufferLoad,
  '.json': onObjectBufferLoad,

  '.hdr': onHDRImageBufferLoad,
  '.exr': onEXRImageBufferLoad,
  '.jpeg': onImageBufferLoad,
  '.jpg': onImageBufferLoad,
  '.png': onImageBufferLoad,

}