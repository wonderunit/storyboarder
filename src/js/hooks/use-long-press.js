const { useState, useEffect, useCallback } = require('react')

module.exports = function useLongPress(callback = () => {}, ms = 300) {
  const [startLongPress, setStartLongPress] = useState(false);
  const [longPress, setLongPress] = useState(false);
  
  useEffect(() => {
    let timerId;
    
    if (startLongPress) {
      callback();
      timerId = setInterval(() => setLongPress(true), ms);
    } else {
      clearInterval(timerId);
      setLongPress(false);
    }
    
    return () => {
      clearInterval(timerId);
      setLongPress(false);
    };
  }, [startLongPress]);
  
  useEffect(() => {
    let timerId;
    
    if (longPress) {
      timerId = setInterval(callback, 1000 / 30);
    } else {
      clearInterval(timerId);
    }
    
    return () => {
      clearInterval(timerId);
    };
  }, [longPress]);
  
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
