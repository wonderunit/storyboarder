const { useMemo, useEffect, useRef } = React = require('react')
const { connect } = require('react-redux')

const h = require('../utils/h')

const Guides = require('../window/guides')

const GuidesView = connect(
  state => ({
    visible: state.mainViewCamera === 'live',
    center: state.workspace.guides.center,
    thirds: state.workspace.guides.thirds
  })
)
(({ dimensions, visible, center, thirds }) => {
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
  
    guides.setState({ center, thirds })
  }, [guides, center, thirds])

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
})

module.exports = GuidesView
