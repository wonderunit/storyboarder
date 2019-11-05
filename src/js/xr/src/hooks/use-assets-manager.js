const THREE = require('three')
const React = require('react')
const { useState, useReducer, useMemo, useCallback } = React

const { GLTFLoader } = require('three/examples/jsm/loaders/GLTFLoader')

const reducer = (state, action) => {
  const { type, payload } = action
  const { id, progress, value, error } = payload

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
        [id]: { status: 'Success', value }
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

const useAssetsManager = () => {
  const [loader] = useState(() => new GLTFLoader())
  const [textureLoader] = useState(() => new THREE.TextureLoader())

  const [assets, dispatch] = useReducer(reducer, {})

  useMemo(() => {
    Object.entries(assets)
      .filter(([_, o]) => o.status === 'NotAsked')
      .forEach(([id]) => {
        if (!id.includes('/images/')) {
          loader.load(
            id,
            value => dispatch({ type: 'SUCCESS', payload: { id, value } }),
            progress => dispatch({ type: 'PROGRESS', payload: { id, progress } }),
            error => dispatch({ type: 'ERROR', payload: { id, error } })
          )
          dispatch({ type: 'LOAD', payload: { id } })
        } else {
          textureLoader.load(
            id,
            value => dispatch({ type: 'SUCCESS', payload: { id, value } }),
            progress => dispatch({ type: 'PROGRESS', payload: { id, progress } }),
            error => dispatch({ type: 'ERROR', payload: { id, error } })
          )
          dispatch({ type: 'LOAD', payload: { id } })
        }
      })
  }, [assets])

  const requestAsset = useCallback(
    id => dispatch({ type: 'PENDING', payload: { id }}),
    []
  )

  const getAsset = useCallback(
    id => assets[id] && assets[id].value,
    [assets]
  )

  return { assets, requestAsset, getAsset }
}

module.exports = {
  useAssetsManager
}
