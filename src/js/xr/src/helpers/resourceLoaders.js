import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader'
import {ColladaLoader} from 'three/examples/jsm/loaders/ColladaLoader'
import {OBJLoader} from 'three/examples/jsm/loaders/OBJLoader'
import {FBXLoader} from 'three/examples/jsm/loaders/FBXLoader'
import {STLLoader} from 'three/examples/jsm/loaders/STLLoader'

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