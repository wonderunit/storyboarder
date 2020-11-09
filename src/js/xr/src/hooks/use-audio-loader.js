// via https://github.com/react-spring/react-three-fiber/blob/bb38fe9/src/hooks.ts#L76

const THREE = require('three')
const { useState, useEffect, useMemo } = React = require('react')
const {onAudioBufferLoad} = require('../helpers/resourceLoaders')

const useAudioLoader = (SGConnection, filepath) => {
  const key = useMemo(() => ({}), [filepath])
  const [cache] = useState(() => new WeakMap())
  const [loader] = useState(() => new THREE.AudioLoader())
  const [_, forceUpdate] = useState(false)
  useEffect(() => {
    if (!cache.has(key)) {

      SGConnection.getResource('audio', filepath)
      .then(({data}) => {
        onAudioBufferLoad(data)
        .then((buffer) => {
          cache.set(key, buffer)
          forceUpdate(i => !i)
        })
      })

    }
  }, [filepath])
  return cache.get(key) || null
}

module.exports = useAudioLoader
