const { useState, useEffect, useCallback } = require('react')

module.exports = function useLongPress(callback = () => {}, ms = 100) {
  const [startLongPress, setStartLongPress] = useState(false);
  
  useEffect(() => {
    let timerId;
    if (startLongPress) {
      callback();
      timerId = setInterval(callback, ms);
    } else {
      clearInterval(timerId);
    }
    
    return () => {
      clearInterval(timerId);
    };
  }, [startLongPress]);
  
  const start = useCallback(() => {
    setStartLongPress(true);
  }, []);
  const stop = useCallback(() => {
    setStartLongPress(false);
  }, []);
  
  return {
    onMouseDown: start,
    onMouseUp: stop,
    onMouseLeave: stop,
    onTouchStart: start,
    onTouchEnd: stop,
  };
}
