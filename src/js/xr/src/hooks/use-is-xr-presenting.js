const { useEffect, useState } = React
const { useThree } = require('react-three-fiber')

const useIsXrPresenting = () => {
  const { gl } = useThree()

  const [state, setState] = useState(false)

  const onChange = event => setState(gl.xr.isPresenting)

  useEffect(() => {
    gl.xr.addEventListener('sessionstart', onChange)
    gl.xr.addEventListener('sessionend', onChange)

    return function cleanup () {
      gl.xr.addEventListener('sessionstart', onChange)
      gl.xr.addEventListener('sessionend', onChange)
    }
  }, [])

  return state
}

module.exports = useIsXrPresenting
