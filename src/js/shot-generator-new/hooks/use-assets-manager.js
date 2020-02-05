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

const isLoaded = (path) => {
  const state = cache.get()

  return (state[path] && state[path].status === LOADING_MODE.SUCCESS)
}

const assetExist = (path) => Boolean(cache.get()[path])

export const loadAsset = (path) => {
  if (!path) {
    return null
  }

  const current = cache.get()

  if (!current[path]) {
    cache.set({
      ...cache.get(),
      [path]: {data: null, status: LOADING_MODE.PENDING}
    })

    return new Promise((resolve, reject) => {
      const current = cache.get()

      if (!current[path].data) {

        let loader
        if (!path.match(/(\.(png|jpg|jpeg|gif)$)|((\\|\/)(images|volumes)(\\|\/))/mi)) {
          loader = gtlfLoader
        } else {
          loader = textureLoader
        }

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
              [path]: {data: null, status: LOADING_MODE.ERROR}
            })
            
            console.error(error)

            reject(error)
          }
        )
      } else {
        resolve(current[path])
      }
    })
  }
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
      
      if (isLoaded(pt)) {
        setAssetId(getAssetId(pt))
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
    loaded: Boolean(assetId !== null)
  }
}

export const requestAsset = (path) => {
  const current = cache.get()
  if (!current[path]) {
    loadAsset(path)
  }
}

let used = 0
export const useAssets = (paths) => {
  const [assetsToLoad, setAssetsToLoad] = useState(paths)
  
  useEffect(() => {
    const shouldLoad = paths.filter(asset => !assetExist(asset))

    shouldLoad.map(loadAsset)
    setAssetsToLoad(shouldLoad)
  }, [paths])

  useEffect(() => {
    if (assetsToLoad.length === 0) {
      return
    }
    
    const fn = () => {
      const toLoadNext = assetsToLoad.filter(asset => !isLoaded(asset))
      
      if (toLoadNext.length !== assetsToLoad.length) {
        setAssetsToLoad(toLoadNext)
      }
    }

    cache.subscribe(fn)

    return () => {
      cache.unsubscribe(fn)
    }
  }, [assetsToLoad, paths])

  const assets = useMemo(() => {
    const current = cache.get()

    return paths.filter(isLoaded).map((path) => {
      return current[path].data
    })
  }, [assetsToLoad, paths])
  
  return {
    assets,
    loaded: (assetsToLoad.length === 0),
    hash: assets.reduce((acc, v) => acc + v.uuid, '') + (++used)
  }
}
