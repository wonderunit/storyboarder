const { useRender } = require('react-three-fiber')

const { useMemo, useState, useRef } = React = require('react')

const FPSMeter = ({ rStats, textCreator, ...props }) => {
  const [fps, setFps] = useState(0)

  const prev = useRef(null)

  useRender((state, time) => {
    if (prev.current == null) prev.current = time

    const delta = time - prev.current

    if (delta > 1000) {
      prev.current = time
      let value = parseInt(rStats('FPS').value(), 10)
      setFps(value)
    }
  })

  const group = useRef(null)
  useMemo(() => {
    if (group.current) {
      // changed in dataguivr 0.1.6
      group.current.update(fps.toString())
    } else {
      group.current = textCreator.create(
        fps.toString(),
        {
          color: 0xff0000,
          scale: 1,
          centerText: false
        }
      )
    }
  }, [fps])

  return <primitive {...props} object={group.current} />
}

module.exports = FPSMeter
