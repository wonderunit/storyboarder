const { useMemo, useRef, useState } = React = require('react')

const useInterval = require('../hooks/use-interval')

const SDFText = require('datguivr/modules/datguivr/sdftext')
const textCreator = SDFText.creator()

const SimpleText = ({
  label,
  textProps = {},
  ...props
}) => {
  const group = useRef(null)

  useMemo(() => {
    if (group.current) {
      // changed in dataguivr 0.1.6
      group.current.update(label.toString())
    } else {
      group.current = textCreator.create(
        label.toString(),
        {
          color: 0xffffff,
          scale: 1,
          centerText: false,
          ...textProps
        }
      )
    }
  }, [label])

  return <primitive {...props} object={group.current} />
}

const Stats = ({ rStats, position }) => {
  const [fps, setFps] = useState(0)
  const [calls, setCalls] = useState(0)
  const [triangles, setTriangles] = useState(0)

  useInterval(
    () => setFps(Math.round(parseFloat(rStats('fps').value()))),
    250)

  useInterval(
    () => setCalls(rStats('renderer.info.render.calls').value()),
    1000
  )

  useInterval(
    () => setTriangles(rStats('renderer.info.render.triangles').value()),
    1000
  )

  return (
    <group position={position}>
      <SimpleText label={`F ${fps}`} position={[0.3, 0.05, 0]} textProps={{ color: 0xff0000 }}/>
      <SimpleText label={`C ${calls}`} position={[0.3, 0.00, 0]} textProps={{ color: 0xff0000 }} />
      <SimpleText label={`T ${triangles}`} position={[0.3, -0.05, 0]} textProps={{ color: 0xff0000 }} />
    </group>
  )
}

module.exports = Stats
