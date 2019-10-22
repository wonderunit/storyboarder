const { useState } = React = require('react')

//const SimpleText = require('../components/SimpleText')

const { create } = require('zustand')

const [useLogStore, useLogStoreApi] = create(set => ({
  log: []
}))

const reducer = (state, ...rest) => {
  let string = rest.join(', ')
  let next = state.log.slice()
  next.push(string)
  let log = next.slice(-5)

  return { ...state, log }
}

const Log = ({ position }) => {
  const log = useLogStore(state => state.log)
  const label = log.join('\n')

  return (
    <group position={position}>
    </group>
  )

  // return (
  //   <group position={position}>
  //     <SimpleText
  //       label={label}
  //       position={[0.3, 0.05, 0]}
  //       textProps={{
  //         color: 0x00aa00,
  //         scale: 0.75
  //       }} />
  //   </group>
  // )
}

module.exports = {
  log: (...rest) => useLogStoreApi.setState(reducer(useLogStoreApi.getState(), ...rest)),
  Log
}
