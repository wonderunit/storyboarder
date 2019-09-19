const { useEffect, useState } = React

const useIsVrPresenting = () => {
  const [state, setState] = useState(false)

  const onChange = event => setState(event.display.isPresenting)

  useEffect(() => {
    window.addEventListener('vrdisplaypresentchange', onChange)

    return function cleanup () {
      window.removeEventListener('vrdisplaypresentchange', onChange)
    }
  }, [])

  return state
}

module.exports = useIsVrPresenting
