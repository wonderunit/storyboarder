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
  const handleResize = () => {
    if (ref && ref.current) {
      setComponentSize(getSize(mainElement.current, asideElement.current))
    }
  }

  useLayoutEffect(() => {
    mainElement.current = document.getElementById("main")
    asideElement.current = document.getElementById("aside")
    handleResize()
    window.addEventListener('resize', handleResize)
    
    return () => {
      window.removeEventListener('resize', handleResize) 
    }
  }, [ref.current])

  return ComponentSize
}

module.exports = useComponentSize
