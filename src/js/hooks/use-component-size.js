// via https://github.com/rehooks/component-size/blob/master/index.js

let { useState, useLayoutEffect, useRef } = require('react')

function getSize(mainElement, asideElement) {
  if (!mainElement || !asideElement) {
    return {}
  }

  return {
    width: mainElement.offsetWidth - asideElement.offsetWidth,
    height: mainElement.offsetHeight
  }
}

function useComponentSize(ref) {
  let [ComponentSize, setComponentSize] = useState(getSize(ref.current))
  let mainElement = useRef()
  let asideElement = useRef()
  function handleResize() {
    if (ref && ref.current) {
      setComponentSize(getSize(mainElement.current, asideElement.current))
    }
  }

  useLayoutEffect(() => {
    handleResize()
    mainElement.current = document.getElementById("main")
    asideElement.current = document.getElementById("aside")
    /* if (ResizeObserver) {
      let resizeObserver = new ResizeObserver(() => handleResize())
      resizeObserver.observe(ref.current)

      return () => {
        resizeObserver.disconnect(ref.current)
        resizeObserver = null
      }
    } else  */ {
      window.addEventListener('resize', handleResize)
      
      return () => {
        window.removeEventListener('resize', handleResize) 
      }
    }
    
  }, [ref.current])

  return ComponentSize
}

module.exports = useComponentSize
