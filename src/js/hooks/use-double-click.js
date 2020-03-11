const {useEffect, useCallback, useRef} = require('react')

module.exports = function useDoubleClick(callback = () => {}) {
  const savedCallback = useRef(callback)
  const lastTap = useRef(0)
  
  useEffect(() => {
    savedCallback.current = callback;
  }, [callback])

  const onPointerDownDbl = useCallback((event) => {
    if ((event.timeStamp - lastTap.current) < 180) {
      savedCallback.current(event)
    }

    lastTap.current = event.timeStamp
  }, [])
  
  return {
    onPointerDown: onPointerDownDbl,
    onDoubleClick: savedCallback.current
  };
}
