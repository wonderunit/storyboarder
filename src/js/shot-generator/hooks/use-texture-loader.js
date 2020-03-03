// via https://github.com/react-spring/react-three-fiber/blob/bb38fe9/src/hooks.ts#L76

const THREE = require('three')
const { useState, useEffect, useMemo } = React = require('react')

const useTextureLoader = filepath => {
  const key = useMemo(() => ({}), [filepath])
  const [cache] = useState(() => new WeakMap())
  const [loader] = useState(() => new THREE.TextureLoader())
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

module.exports = useTextureLoader
