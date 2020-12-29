const THREE = require('three')
const { onBitmapImageBufferLoad } = require('../helpers/resourceLoaders')
const { useState, useEffect } = React = require('react')

const useImageBitmapLoader = (SGConnection, filepath) => {
  const [_, forceUpdate] = useState(false)

  useEffect(() => {
    if (!THREE.Cache.get(filepath)) {
      SGConnection.getResource('image', filepath)
      .then(({data}) => {
        onBitmapImageBufferLoad(filepath, data)
        .then((bitmap) => {
          console.log('Loaded TEXTUREBITMAP: ', bitmap)
          THREE.Cache.add( filepath, bitmap )
          forceUpdate(i => !i)
        })
      })
    }
  }, [filepath])

  return THREE.Cache.get(filepath) || null
}

module.exports = useImageBitmapLoader
