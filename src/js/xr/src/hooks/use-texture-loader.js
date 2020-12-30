// via https://github.com/react-spring/react-three-fiber/blob/bb38fe9/src/hooks.ts#L76

const THREE = require('three')
const { useState, useEffect, useMemo } = React = require('react')
const {onImageBufferLoad} = require('../helpers/resourceLoaders')

const useTextureLoader = (SGConnection, filepath) => {
  const key = useMemo(() => ({}), [filepath])
  const [cache] = useState(() => new WeakMap())
  const [_, forceUpdate] = useState(false)
  
  useEffect(() => {
    if (!cache.has(key)) {

      SGConnection.getResource('image', filepath)
      .then(({data}) => {
        onImageBufferLoad(filepath, data)
        .then((texture) => {
          console.log('Loaded TEXTURE: ', texture)
          cache.set(key, texture)
          forceUpdate(i => !i)
        })
      })

    }
  }, [filepath])
  return cache.get(key) || null
}

module.exports = useTextureLoader
