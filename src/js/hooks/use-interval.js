// via https://overreacted.io/making-setinterval-declarative-with-react-hooks

const { useEffect, useRef } = React = require('react')

function useInterval (callback, delay) {
  const savedCallback = useRef()

  useEffect(() => {
    savedCallback.current = callback
  }, [callback])

  useEffect(() => {
    function tick() {
      savedCallback.current()
    }
    if (delay !== null) {
      let id = setInterval(tick, delay)
      return () => clearInterval(id)
    }
  }, [delay])
}

module.exports = useInterval
