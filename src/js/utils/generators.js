/**
 * Calls functions one time per callsNumber
 * Example:
 *
 * const myAlert = skipCalls(() => alert('hello'), 4)
 *
 * alert will be fired if we call a function at least 5 times
 *
 * @param {Function} fn - Function to call
 * @param {Number} callsNumber - Number to skip
 * @returns {Function}
 */
const skipCalls = (fn, callsNumber) => {
  let called = 0
  let skip = callsNumber - 1
  
  return (args = [], immediate = false) => {
    if (called >= skip || immediate) {
      fn(...args)
      called = 0
    } else {
      called++
    }
  }
}

/**
 * Calls function when value that passed into it was changed
 *
 * @param {Function} fn - Function to call
 * @param {*} startValue - Default value
 * @returns {Function}
 */
const whenChanged = (fn, startValue) => {
  let current = startValue
  
  return (newValue) => {
    if (newValue !== current) {
      current = newValue
      
      fn(newValue)
    }
  }
}

module.exports = {
  skipCalls,
  whenChanged
}
