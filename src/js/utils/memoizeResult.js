import isEqual from 'lodash.isequal'

const memoizeResult = (fn) => {
  let lastResult = null
  return (state0) => {
    const state = fn(state0)
    if (!isEqual(lastResult, state)) {
      lastResult = state
    }
    
    return lastResult
  }
}

export default memoizeResult
