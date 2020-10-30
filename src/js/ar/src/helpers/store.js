import * as RemoteDevice from "../../../shared/network/client"
import {applyMiddleware, createStore} from "redux"
import {initialState, reducer} from "../../../shared/reducers/shot-generator"

export const SGConnection = RemoteDevice.connect()
window.addEventListener("error", function (e) {
  SGConnection.log([e.error.message, e.error.stack])
  return false;
})

const store = createStore(reducer, {...initialState}, applyMiddleware(SGConnection.ClientMiddleware))
SGConnection.connectStore(store)

SGConnection.setActive(true)

export default store
