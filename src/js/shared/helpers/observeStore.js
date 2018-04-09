// see also: https://github.com/jprichardson/redux-watch
const observeStore = (store, select, onChange, shouldInitialize = false) => {
  let currentState

  const handleChange = () => {
    let nextState = select(store.getState())
    if (nextState !== currentState) {
      currentState = nextState
      onChange(currentState)
    }
  }

  let unsubscribe = store.subscribe(handleChange)
  if (shouldInitialize) { handleChange() }
  return unsubscribe
}

module.exports = observeStore
