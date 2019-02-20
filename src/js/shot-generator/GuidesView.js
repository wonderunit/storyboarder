const { useMemo, useEffect, useRef } = React = require('react')
const { connect } = require('react-redux')

const h = require('../utils/h')

const Guides = require('../window/guides')

const GuidesView = connect(
  state => ({
    visible: state.mainViewCamera === 'live',
    center: state.workspace.guides.center,
    thirds: state.workspace.guides.thirds,
    eyeline: state.workspace.guides.eyeline
  })
)
(({ dimensions, visible, center, thirds, eyeline }) => {
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
  
    guides.setState({ center, thirds, eyeline })
  }, [guides, center, thirds, eyeline])

  return h([
    'canvas',
    { key: 'guides-canvas',
      ref: guidesCanvasRef,
      id: 'guides-canvas',
      width: dimensions.width,
      height: dimensions.height,
      style: {
        width: dimensions.width,
        height: dimensions.height,
        visibility: visible ? 'visible' : 'hidden'
      }
    }
  ])
})

module.exports = GuidesView
