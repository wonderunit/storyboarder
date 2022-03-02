import * as RemoteDevice from "../../../shared/network/client"
import {applyMiddleware, createStore} from "redux"
import {initialState, reducer} from "../../../shared/reducers/shot-generator"
import { compose } from 'redux'
export const Connection = {current: null}
export const Store = {current: null}

export const connect = async () => {
  const SGConnection = await RemoteDevice.connect()

  const actionSanitizer = action => (
    action.type === 'ATTACHMENTS_SUCCESS' && action.payload ?
    { ...action, payload: { ...action.payload, value: '<<DATA>>' } } : action
  )
  const stateSanitizer = state => state.attachments ? { ...state, attachments: '<<ATTACHMENTS>>' } : state
  const reduxDevtoolsExtensionOptions = {
    actionSanitizer,
    stateSanitizer,
    trace: true,
  }

  const composeEnhancers =
        typeof window === 'object' &&
        window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ ?   
          window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__(reduxDevtoolsExtensionOptions) : compose

  const enhancer = composeEnhancers(
    applyMiddleware(SGConnection.ClientMiddleware),
    // other store enhancers if any
  )

  // const store = createStore(reducer, {...initialState}, applyMiddleware(SGConnection.ClientMiddleware))
  const store = createStore(reducer,{...initialState}, enhancer)
  SGConnection.connectStore(store)

  Connection.current = SGConnection
  Store.current = store

  window.addEventListener("error", function (e) {
    SGConnection.log([e.error.message, e.error.stack])
    return false;
  })

  SGConnection.setActive(true)

  SGConnection.connectRequest()

  return store
}
