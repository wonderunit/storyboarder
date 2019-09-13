const THREE = require('three')
const { useState, useEffect } = React = require('react')

const useImageBitmapLoader = filepath => {
  const [_, forceUpdate] = useState(false)

  useEffect(() => {
    if (!THREE.Cache.get(filepath)) {
      new THREE.ImageBitmapLoader().load(
        filepath,
        () => forceUpdate(i => !i)
      )
    }
  }, [filepath])

  return THREE.Cache.get(filepath) || null
}

module.exports = useImageBitmapLoader
