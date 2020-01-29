const { useThree, useFrame } = require('react-three-fiber')
const { useRef, useMemo } = React = require('react')

const rStats = require('../../vendor/rStats.js')
const { threeStats } = require('../../vendor/rStats.extras.js')

const useRStats = () => {
  const { gl } = useThree()
  const ref = useRef()

  const getRStats = () => {
    if (!ref.current) {
      ref.current = new rStats({
        css: [],
        values: {
          fps: { caption: 'fps', below: 30 }
        },
        groups: [{ caption: 'Framerate', values: ['fps', 'raf'] }],
        plugins: [new threeStats(gl)]
      })
      ref.current().element.style.color = '#eee'
    }
    return ref.current
  }

  useFrame(() => {
    let r = getRStats()
    r('rAF').tick()
    r('FPS').frame()
    r().update()
  })

  return getRStats()
}

module.exports = useRStats
