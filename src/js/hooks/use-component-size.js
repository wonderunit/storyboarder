// via https://github.com/rehooks/component-size/blob/master/index.js

let { useState, useLayoutEffect } = require('react')

function getSize(el) {
  if (!el) {
    return {}
  }

  return {
    width: el.offsetWidth,
    height: el.offsetHeight
  }
}

function useComponentSize(ref) {
  let [ComponentSize, setComponentSize] = useState(getSize(ref.current))

  function handleResize() {
    if (ref && ref.current) {
      setComponentSize(getSize(ref.current))
    }
  }

  useLayoutEffect(() => {
    handleResize()

    if (ResizeObserver) {
      let resizeObserver = new ResizeObserver(() => handleResize())
      resizeObserver.observe(ref.current)

      return () => {
        resizeObserver.disconnect(ref.current)
        resizeObserver = null
      }
    } else {
      window.addEventListener('resize', handleResize)
      
      return () => {
        window.removeEventListener('resize', handleResize) 
      }
    }
    
  }, [])

  return ComponentSize
}

module.exports = useComponentSize
