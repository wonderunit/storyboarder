import * as RemoteDevice from "../../../shared/network/client"
import {applyMiddleware, createStore} from "redux"
import {initialState, reducer} from "../../../shared/reducers/shot-generator"

export const Connection = {current: null}
export const Store = {current: null}

export const connect = async () => {
  const SGConnection = await RemoteDevice.connect()

  const store = createStore(reducer, {...initialState}, applyMiddleware(SGConnection.ClientMiddleware))
  SGConnection.connectStore(store)

  Connection.current = SGConnection
  Store.current = store

  window.addEventListener("error", function (e) {
    SGConnection.log([e.error.message, e.error.stack])
    return false;
  })

  //SGConnection.setActive(true)

  SGConnection.connectRequest()

  return store
}
