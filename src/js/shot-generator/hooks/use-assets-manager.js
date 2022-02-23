import * as THREE from 'three'
import React, { useState, useMemo, useEffect } from 'react'
import observable from '../../utils/observable'
import path, * as pathFile from 'path'
import SGLoaders from '../utils/shot-generator-loaders'
import chooseLoader from '../../shared/THREE/loadRes'

/**
 * Resources storage
 * @type {observable}
 */
export const cache = observable({})


const LOADING_MODE = {
  PENDING: 'PENDING',
  SUCCESS: 'SUCCESS',
  ERROR: 'ERROR'
}

/**
 * Checks if resource has been loaded
 * @param path Resource path
 * @returns {boolean}
 */
const isLoaded = (path) => {
  const state = cache.get()

  return (state[path] && state[path].status === LOADING_MODE.SUCCESS)
}

/**
 * Checks if asset is loaded or if asset fetching has been started
 * @param path
 * @returns {boolean}
 */
const assetExist = (path) => Boolean(cache.get()[path])

const isAssetPending = (path) => (cache.get()[path] && cache.get()[path].status === LOADING_MODE.PENDING)

/**
 * Fetches resource
 * @param path Resource path
 * @returns {Promise<null|THREE.Texture|THREE.Object>}
 */
export const loadAsset = (path) => {
  if (!path) {
    return Promise.resolve(null)
  }

  const current = cache.get()

  if (!current[path]) {
    cache.set({
      ...cache.get(),
      [path]: {data: null, status: LOADING_MODE.PENDING, usageCount: 0, lastUsedDate: Date.now()}
    })

    return new Promise((resolve, reject) => {
      const current = cache.get()

      if (!current[path].data) {
        const { ext , loader } = chooseLoader({appLoaders: SGLoaders, id: path})
        loader.load(
          path,
          (value, data) => {
            value.name = pathFile.parse(path).name
            cache.set({
              ...cache.get(),
              [path]: {data: value, status: LOADING_MODE.SUCCESS, usageCount: current[path].usageCount, lastUsedDate: current[path].lastUsedDate, ext }
            })
            resolve(current[path])
          },
          null, //progress => dispatch({ type: 'PROGRESS', payload: { id, progress } }),
          error => {
            cache.set({
              ...cache.get(),
              [path]: {data: null, status: LOADING_MODE.ERROR}
            })
            reject(error)
          }
        )
      } else {
        resolve(current[path])
      }
    })
  }
}

const cleanUnusedAssets = () => {
  const current = cache.get()
  let keys = Object.keys(current)
  for(let i = 0; i < keys.length; i++) {
      let key = keys[i]
      let currentAsset = current[key]
      if(currentAsset.usageCount === 0) {
          let difference = (Date.now() - currentAsset.lastUsedDate) / 60000
          if(difference >= 15) {
              delete current[key]
          }
      }
  }
} 

export const cleanUpCache = () => {
  cache.set({})
}
/**
 * Hook that allows components to fetch resources
 * @param paths Array of resources paths
 * @returns {{loaded: boolean, assets: Array, ext: Array }}
 */
export const useAssets = (paths) => {
  const [assetsToLoad, setAssetsToLoad] = useState(paths || [])

  /**
   * Fetch not fetched resources if 'paths' variable was changed
   */
  useEffect(() => {
    const shouldLoad = paths.filter(asset => !assetExist(asset))
    const pendingAssets = paths.filter(asset => isAssetPending(asset))
    if (shouldLoad.length > 0) {
      shouldLoad.map(loadAsset) // Fetch here
    }

    // Update 'assetsToLoad' to know, how many objects we are waiting for fetch
    setAssetsToLoad(shouldLoad.concat(pendingAssets))
    for(let i = 0; i < paths.length; i++) {
      cache.get()[paths[i]].usageCount += 1
      cache.get()[paths[i]].lastUsedDate = Date.now()
    }
    cleanUnusedAssets()
    return () => {
      for(let i = 0; i < paths.length; i++) {
        let currentModel = cache.get()[paths[i]]
        if(!currentModel) continue
        currentModel.usageCount -= 1
      }
    }
  }, [paths.reduce((acc, v) => acc + v, '')])

  /**
   * Subscribe to cache on mount, remove subscription on unmount
   */
  useEffect(() => {
    if (assetsToLoad.length === 0) {
      // If we don't have assetsToLoad then exit
      return
    }
    
    // Next function is called when some resource has been loaded
    const fn = () => {
      // Get resources that haven't fetched yet
      const toLoadNext = assetsToLoad.filter(asset => !isLoaded(asset))
      
      // If we still have any resources to fetch then update 'assetsToLoad'
      if (toLoadNext.length !== assetsToLoad.length) {
        setAssetsToLoad(toLoadNext)
      }
    }

    cache.subscribe(fn)

    return () => {
      cache.unsubscribe(fn)
    }
  }, [assetsToLoad, paths])

  // This returns our assets
  const assets = useMemo(() => {
    const current = cache.get()

    // Get only loaded assets
    let loadedAssets = paths.filter(isLoaded).map((path) => {
      return current[path].data
    })
    let loadedAssetsExt = paths.filter(isLoaded).map((path) => {
      return current[path].ext
    })
    return {
      loadedAssets,
      loadedAssetsExt
    }
  }, [assetsToLoad, paths])

  return {
    assets: assets.loadedAssets,
    ext: assets.loadedAssetsExt,
    loaded: (assetsToLoad.length === 0) // Are assets loaded?
  }
}

/**
 * Hook that allows components to fetch single resource
 * @param path Resources path
 * @returns {{loaded: boolean, asset: THREE.Texture|THREE.Object, ext: string}}
 */
export const useAsset = (path) => {
  const {assets, loaded, ext} = useAssets(path ? [path] : [])

  return {asset: assets[0], ext: ext[0], loaded}
}
