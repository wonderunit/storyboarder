import React from 'react'
import {connect} from 'react-redux'
import {getRemoteDevices, RemoteContext} from "../../../shared/reducers/remoteDevice"

const RemoteClients = React.memo(({clients, id, Component, clientProps}) => {
  return Object.keys(clients).map((clientId) => {
    if (id === clientId || clients[clientId].active === false) {
      return null
    }
    
    return (
      <Component
        key={clientId}
        {...clientProps}
        {...clients[clientId]}
      />
    )
  })
})

export default connect(
  (state) => ({
    clients: getRemoteDevices(state),
    id: state.id
  }),
  null,
  null,
  {context: RemoteContext}
)(RemoteClients)
