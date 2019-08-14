const { useThree, useRender } = require('react-three-fiber')
const { useRef, useMemo } = React = require('react')

const rStats = require('rstatsjs/src/rStats.js')
const { threeStats } = require('rstatsjs/src/rStats.extras.js')

const useRStats = () => {
  const { gl } = useThree()
  const ref = useRef()

  useMemo(() => {
    ref.current = new rStats({
      css: [],
      values: {
        fps: { caption: "fps", below: 30 }
      },
      groups: [{ caption: "Framerate", values: ["fps", "raf"] }],
      plugins: [new threeStats(gl)]
    })
    ref.current().element.style.color = '#eee'
    ref.current().element.style.lineHeight = 1.5
  }, [])

  useRender(() => {
    ref.current("rAF").tick()
    ref.current("FPS").frame()
    ref.current().update()
  })

  return ref.current
}

module.exports = useRStats
