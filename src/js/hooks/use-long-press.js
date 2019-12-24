const { useState, useEffect, useCallback, useRef } = require('react')

module.exports = function useLongPress(callback = () => {}, ms = 300) {
  const [startLongPress, setStartLongPress] = useState(false)
  const [longPress, setLongPress] = useState(false)
  
  const savedCallback = useRef()
  
  useEffect(() => {
    savedCallback.current = callback;
  }, [callback])
  
  useEffect(() => {
    let timerId
    
    if (startLongPress) {
      savedCallback.current()
      timerId = setInterval(() => setLongPress(true), ms)
    } else {
      clearInterval(timerId)
      setLongPress(false)
    }
    
    return () => {
      clearInterval(timerId)
      setLongPress(false)
    }
  }, [startLongPress])
  
  useEffect(() => {
    let timerId
    
    if (longPress) {
      timerId = setInterval(savedCallback.current, 1000 / 30)
    } else {
      clearInterval(timerId)
    }
    
    return () => {
      clearInterval(timerId)
    }
  }, [longPress])
  
  const start = useCallback(() => {
    setStartLongPress(true)
  }, [])
  const stop = useCallback(() => {
    setStartLongPress(false)
    setLongPress(false)
  }, [])
  
  return {
    onPointerDown: start,
    onPointerUp: stop,
    onPointerLeave: stop,
    onTouchStart: start,
    onTouchEnd: stop
  };
}
