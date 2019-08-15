const { useMemo, useRef, useState } = React = require('react')
const { useThree } = require('react-three-fiber')

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
  const { gl } = useThree()

  const [fps, setFps] = useState(0)

  useInterval(
    () => setFps(Math.round(parseFloat(rStats('fps').value()))),
    250)

  let label = `F ${fps}\nC ${gl.info.render.calls}\nT ${gl.info.render.triangles}`

  return (
    <group position={position}>
      <SimpleText label={label} position={[0.3, 0.05, 0]} textProps={{ color: 0xff0000 }}/>
    </group>
  )
}

module.exports = Stats
