const { useMemo, useEffect, useRef } = React = require('react')

const h = require('../utils/h')

const Guides = require('../window/guides')

const GuidesView = ({ dimensions, visible }) => {
  const guidesCanvasRef = useRef()
  const guides = useMemo(
    () => {
      if (!dimensions.width) return
      if (!guidesCanvasRef.current) return
  
      let g = new Guides({
        width: dimensions.width,
        height: dimensions.height,
        onRender: () => {}
      })
      g.canvas = guidesCanvasRef.current
      g.context = guidesCanvasRef.current.getContext('2d')
      return g
    },
    [guidesCanvasRef, dimensions]
  )

  useEffect(() => {
    if (!guides) return
  
    guides.setState({ center: true, thirds: true })
  }, [guides])

  return h([
    'canvas',
    { key: 'guides-canvas',
      ref: guidesCanvasRef,
      id: 'guides-canvas',
      width: dimensions.width,
      height: dimensions.height,
      style: {
        position: 'absolute',
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        width: dimensions.width,
        height: dimensions.height,
        visibility: visible ? 'visible' : 'hidden'
      }
    }
  ])
}

module.exports = GuidesView
