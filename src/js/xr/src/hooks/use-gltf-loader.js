// via https://github.com/react-spring/react-three-fiber/blob/bb38fe9/src/hooks.ts#L76

const THREE = require('three')
const { GLTFLoader } = require('three/examples/jsm/loaders/GLTFLoader')
const { useState, useEffect, useMemo } = React = require('react')

const useGltfLoader = filepath => {
  const key = useMemo(() => ({}), [filepath])
  const [cache] = useState(() => new WeakMap())
  const [loader] = useState(() => new GLTFLoader())
  const [_, forceUpdate] = useState(false)
  useEffect(() => {
    if (!cache.has(key)) {
      loader.load(filepath, gltf => {
        cache.set(key, gltf)
        forceUpdate(i => !i)
      })
    }
  }, [filepath])
  return cache.get(key) || null
}

module.exports = useGltfLoader
