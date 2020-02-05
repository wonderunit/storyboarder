import * as THREE from 'three'
import React, { useState, useMemo, useEffect, useRef } from 'react'
import '../../vendor/three/examples/js/loaders/GLTFLoader'
import observable from "../../utils/observable";


export const cache = observable({})

const gtlfLoader = new THREE.GLTFLoader()
const textureLoader = new THREE.TextureLoader()

const LOADING_MODE = {
  PENDING: 'PENDING',
  SUCCESS: 'SUCCESS',
  ERROR: 'ERROR'
}

export const loadAsset = (path) => {
  if (!path) {
    return null
  }
  
  return new Promise((resolve, reject) => {
    const current = cache.get()
    
    if (!current[path]) {
      
      let loader
      if (!path.match(/(\.(png|jpg|jpeg|gif)$)|((\\|\/)(images|volumes)(\\|\/))/mi)) {
        loader = gtlfLoader
      } else {
        loader = textureLoader
      }

      // cache.set({
      //   ...cache.get(),
      //   [path]: {data: null, status: LOADING_MODE.PENDING}
      // })
  
      loader.load(
        path,
        value => {
          cache.set({
            ...cache.get(),
            [path]: {data: value, status: LOADING_MODE.SUCCESS}
          })

          resolve(current[path])
        },
        null, //progress => dispatch({ type: 'PROGRESS', payload: { id, progress } }),
        error => {
          cache.set({
            ...cache.get(),
            [path]: {data: error, status: LOADING_MODE.ERROR}
          })

          reject(error)
        }
      )
    } else {
      resolve(current[path])
    }
  })
}

const getAssetId = (path) => {
  const current = cache.get()
  
  if (!path) {
    return null
  }
  
  if (current[path] && current[path].data) {
    return current[path].uuid
  }
  
  return null
}

export const useAsset = (path) => {
  const [assetId, setAssetId] = useState(getAssetId(path))
  const currentPath = useRef(path)
  
  useEffect(() => {
    const fn = (state) => {
      const pt = currentPath.current
      
      if (state[pt] && state[pt].status === LOADING_MODE.SUCCESS) {
        setAssetId(getAssetId(pt))
      } else if (state[pt] && state[pt].status === LOADING_MODE.ERROR) {
        console.error(current[path].data)
      }
    }
    
    cache.subscribe(fn)
    
    return () => {
      cache.unsubscribe(fn)
    }
  }, [])
  
  useEffect(() => {
    const current = cache.get()
    currentPath.current = path

    if (!current[path]) {
      loadAsset(path)
    }

    setAssetId(getAssetId(path))
  }, [path])
  
  const asset = useMemo(() => {
    const current = cache.get()
    
    if (current[path] && current[path].data) {
      return current[path].data
    }
    
    return null
  }, [assetId, path])
  
  return {
    asset,
    assetId,
    loaded: Boolean(assetId !== null)
  }
}
