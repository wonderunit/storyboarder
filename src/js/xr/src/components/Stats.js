const { useMemo, useRef } = React = require('react')

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
  const fps = 0
  const calls = 0
  const triangles = 0

  return (
    <group position={position}>
      <SimpleText label={`F ${fps}`} position={[0.3, 0.05, 0]} textProps={{ color: 0xff0000 }}/>
      <SimpleText label={`C ${calls}`} position={[0.3, 0.00, 0]} textProps={{ color: 0xff0000 }} />
      <SimpleText label={`T ${triangles}`} position={[0.3, -0.05, 0]} textProps={{ color: 0xff0000 }} />
    </group>
  )
}

module.exports = Stats
