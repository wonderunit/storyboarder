import React from 'react'
import {connect} from 'react-redux'
import {getRemoteDevices, RemoteContext} from "../../../shared/reducers/remoteDevice"
import XRClient from "../Three/XRClient"

const RemoteClients = React.memo(({clients, id}) => {
  return Object.keys(clients).map((clientId) => {
    if (id === clientId) {
      return null
    }
    
    return (
      <XRClient
        key={clientId}
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
