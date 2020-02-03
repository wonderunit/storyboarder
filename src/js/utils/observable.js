const observable = (initial = {}) => {
  const listeners = []
  const value = {
    current: initial
  }

  const get = () => value.current

  const subscribe = (fn) => listeners.push(fn)
  const unsubscribe = (fn) => listeners.splice(listeners.indexOf(fn), 1)
  const notify = () => {
    for(let fn of listeners) {
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
