import React from 'react'
import {Provider} from "react-redux"
import {RemoteContext, remoteStore} from "../../../shared/reducers/remoteDevice"

const RemoteProvider = ({children}) => {
  return (
    <Provider context={RemoteContext} store={remoteStore}>
      {children}
    </Provider>
  )
}

export default RemoteProvider
