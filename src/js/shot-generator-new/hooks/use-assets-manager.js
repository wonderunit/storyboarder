import * as THREE from 'three'
import React, { useState, useMemo, useEffect } from 'react'
import '../../vendor/three/examples/js/loaders/GLTFLoader'
import observable from "../../utils/observable";


const cache = observable({})

const gtlfLoader = new THREE.GLTFLoader()
const textureLoader = new THREE.TextureLoader()

const LOADING_MODE = {
  PENDING: 'PENDING',
  SUCCESS: 'SUCCESS',
  ERROR: 'ERROR'
}

export const loadAsset = (path) => {
  return new Promise((resolve, reject) => {
    const current = cache.get()
    
    if (!current[path]) {
      
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
            [path]: {data: error, status: LOADING_MODE.ERROR}
          })

          reject(error)
        }
      )
  
      cache.set({
        ...cache.get(),
        [path]: {data: null, status: LOADING_MODE.PENDING}
      })
    } else {
      resolve(current[path])
    }
  })
}

export const useAsset = (path) => {
  const [updateCount, update] = useState(0)
  
  useEffect(() => {
    const current = cache.get()
    
    if (path && !(current[path] && current[path].data)) {
      loadAsset(path)
    }
  }, [path])
  
  useEffect(() => {
    const fn = () => {
        update(updateCount + 1)
    }
    
    cache.subscribe(fn)
    
    return () => {
      cache.unsubscribe(fn)
    }
  }, [updateCount])
  
  const asset = useMemo(() => {
    const current = cache.get()
    
    if (current[path] && current[path].data) {
      if (current[path].status === LOADING_MODE.ERROR) {
        console.error(current[path].data)
        
        return null
      }
      
      return current[path].data
    }
    
    return null
  }, [updateCount])
  
  return {
    asset,
    updateCount
  }
}
