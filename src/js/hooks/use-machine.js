// via https://codesandbox.io/s/33wr94qv1?module=%2FTodos.jsx
//     https://spectrum.chat/statecharts/general/todomvc-example-with-xstate-and-react-hooks~457d4815-5638-4e33-8315-6b5ba045bbf9
const { useState, useMemo, useEffect } = require('react')
const { interpret } = require('xstate/lib/interpreter')

module.exports = function useMachine (machine, options = {}) {
  const [current, setCurrent] = useState(machine.initialState)
  const service = useMemo(
    () =>
      interpret(machine)
        .onTransition(state => {
          options.log && console.log("CONTEXT:", state.context)
          setCurrent(state)
        })
        .onEvent(e => options.log && console.log("EVENT:", e))
        .start(),
    []
  )

  useEffect(() => {
    return () => service.stop()
  }, [])

  return [current, service.send]
}
