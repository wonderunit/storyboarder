const observable = (initial = {}) => {
  const listeners = []
  const value = {
    current: initial
  }

  const get = () => value.current

  const subscribe = (fn) => listeners.indexOf(fn) === -1 && listeners.push(fn)
  const unsubscribe = (fn) => listeners.indexOf(fn) !== -1 && listeners.splice(listeners.indexOf(fn), 1)
  const notify = () => {
    for(let i = listeners.length - 1; i >= 0; i--) {
      let fn = listeners[i]
      if(!fn) continue
      fn(value.current)
    }
  }

  const set = (v) => {
    value.current = v
    notify()
  }

  return {
    get,
    set,
    subscribe,
    unsubscribe
  }
}

export default observable
