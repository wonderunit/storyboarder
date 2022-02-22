const THREE = require('three')
const React = require('react')
const { useState, useReducer, useMemo, useCallback } = React

const {onImageBufferLoad, onGLTFBufferLoad, onColladaBufferLoad, onObjBufferLoad, onFbxBufferLoad, onStlBufferLoad, on3dsBufferLoad, onPLYBufferLoad, onEXRImageBufferLoad, onHDRImageBufferLoad} = require('../helpers/resourceLoaders')

const path = require('path')
const { useEffect } = require('react')

const reducer = (state, action) => {
  const { type, payload } = action
  const { id, progress, value, error, ext } = payload

  switch (type) {
    case 'PENDING':
      // ignore if already exists
      return (state[id])
        ? state
        : {
          ...state,
          [id]: { status: 'NotAsked' }
        }
    case 'LOAD':
      // ignore if already loading
      return (state[id].loading)
        ? state
        : {
          ...state,
          [id]: { status: 'Loading' }
        }
    case 'PROGRESS':
      return {
        ...state,
        [id]: {
          status: 'Loading',
          progress: {
            loaded: progress.loaded,
            total: progress.total,
            percent: Math.floor(
              progress.loaded / progress.total
            ) * 100
          }
        }
      }
    case 'SUCCESS':
      return {
        ...state,
        [id]: { status: 'Success', value, ext }
      }
    case 'ERROR':
      return {
        ...state,
        [id]: { status: 'Error', error }
      }
    default:
      return state
  }
}

/**
 * HACK
 * @todo Fix unexpected 404 error from the server
 * Sometimes, server returns 404 error, but file exist.
 * Request file multiple times, if still getting 404 then call onerror callback.
 * */
const MaxTimes = 3
const load = (loader, path, events, times = 1) => {
  console.log('load',loader,path,events,times)
  try {
    loader.load(
      path,
      events.onload,
      events.onprogress,
      (error) => {
        if (times >= MaxTimes || (error.code && error.code !== 404)) {
          events.onerror(error)
        } else {
          load(loader, path, events, times + 1)
        }
      }
    )
  } catch (e) {
    console.error(e)
  }
}

const useSelectedAssets = ( getAsset, needAssets, callback = null ) => {

  const [successData, setSuccessData] = useState([]) // array of loaded assets 
  const [assetsList, setAssetsList] = useState(needAssets ? [...needAssets] : [])   // list of need load assets 

  useEffect(() => {   
    setSuccessData([])  // clear array of loaded assets 
    setAssetsList(needAssets ? [...needAssets] : []) // update list of need load assets 
  },[needAssets])

  useEffect(()=> { 
    if (assetsList.length) {     // load assets from assetsList
      const data = []
      const newAssetsList = assetsList
        .map((assetPath) => { 
          const asset = getAsset(assetPath)
          if (!asset) return assetPath  // if no asset try again
          if (callback) callback(asset, assetPath) // fnc to process asset 
          data.push(asset)
          return null   
        })
        .filter((element) => Boolean(element)) // filtered unloaded assets 
      if (data.length) setSuccessData([...successData, ...data]) // if new data -> add to successData
      if (newAssetsList.length !== assetsList.length) setAssetsList(newAssetsList) // if new list of unloaded assets -> update assetsList
    }
  },[ getAsset, assetsList ])

  return assetsList.length ? null : successData // return all assets 
}

const useAssetsManager = (SGConnection) => {

  const [assets, dispatch] = useReducer(reducer, {})

  useMemo(() => {
    Object.entries(assets)
      .filter(([_, o]) => o.status === 'NotAsked')
      .filter(([id]) => id !== false)
      .forEach(([id]) => {
          const exts = /(\.(glb|gltf|obj|dae|fbx|stl|png|jpeg|jpg|3ds|ply))$/gim 
          const match = id.match(exts) 
          const ext = match ? match[0].toLowerCase() : null
          let bufferLoader = null
          switch (ext) {
            case '.jpg':
            case '.jpeg':
            case '.png':
              bufferLoader = onImageBufferLoad
              break     
            case '.exr':
              bufferLoader = onEXRImageBufferLoad
              break
            case '.hdr':
              bufferLoader = onHDRImageBufferLoad
              break
            case '.gltf':
            case '.glb':
              bufferLoader = onGLTFBufferLoad
              break
            case '.obj':
              bufferLoader = onObjBufferLoad
              break
            case '.dae':
              bufferLoader = onColladaBufferLoad
              break
            case '.fbx':
              bufferLoader = onFbxBufferLoad  
              break;    
            case '.stl':
              bufferLoader = onStlBufferLoad
              break  
            case '.3ds':
              bufferLoader = on3dsBufferLoad  
              break;    
            case '.ply':
              bufferLoader = onPLYBufferLoad
              break               
            default:
              break
          }
          SGConnection.getResource(ext, id)
          .then(({data}) => {
            bufferLoader(data,id)
            .then((model) => {
              console.log(`Loaded ${ext}: `, model)
              dispatch({ type: 'SUCCESS', payload: { id, value: model, ext } })
            })
            .catch((error) => {
              console.log(`${ext} loading error`, error)
              dispatch({ type: 'ERROR', payload: { id, error } })
            })
          })
          dispatch({ type: 'LOAD', payload: { id } })
      })
  }, [assets])

  const requestAsset = useCallback(
    id => {
      if (id && (!assets[id])) {
        dispatch({ type: 'PENDING', payload: { id }})
      }
      
      return null
    },
    []
  )

  const getAsset = useCallback(
    id => assets[id] ? assets[id].value : requestAsset(id),
    [assets]
  )

  const getExt = useCallback(
    id => assets[id] && assets[id].ext ? assets[id].ext : null,
    [assets]
  )

  return { assets, requestAsset, getAsset, getExt }
}

module.exports = {
  useAssetsManager,
  useSelectedAssets
}
