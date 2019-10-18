const { useState } = React = require('react')
const { useThree } = require('react-three-fiber')

const useInterval = require('../hooks/use-interval')

//const SimpleText = require('../components/SimpleText')

const Stats = ({ rStats, position }) => {
  const { gl } = useThree()

  const [fps, setFps] = useState(0)

  useInterval(
    () => setFps(Math.round(parseFloat(rStats('fps').value()))),
    250)

  // gl.info.render.calls
  // reports the amount of draw calls for a single render call.
  // if you have multiple calls of WebGLRenderer.render() in order to produce a single frame,
  // you need to set renderer.info.autoReset to false
  // and call renderer.info.reset() manually at the end of your frame.
  // via https://discourse.threejs.org/t/where-can-i-see-the-number-of-draw-calls-per-frame/4311/3

  let label = `F ${fps}\nC ${gl.info.render.calls}\nT ${gl.info.render.triangles}`

  // return (
  //   <group position={position}>
  //     <SimpleText label={label} position={[0.3, 0.05, 0]} textProps={{ color: 0xff0000 }}/>
  //   </group>
  // )
  return (
    <group position={position}>
    </group>
  )
}

module.exports = Stats
