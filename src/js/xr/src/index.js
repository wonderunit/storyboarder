import './style.css'
import './../vendor/rStats.css'
import React, { useState, useEffect, useRef } from 'react'
import ProgressIntro from './components/ProgressIntro'
import { composeWithDevTools } from '@redux-devtools/extension'

require("../../shared/helpers/monkeyPatchGrayscale")

const {
  createStore,
  applyMiddleware
} = require('redux')

const ReactDOM = require('react-dom')

const {Provider} = require('react-redux')

const thunkMiddleware = require('redux-thunk').default

const {
  reducer,
  initialState
} = require('../../shared/reducers/shot-generator')

const RemoteDevice = require('./../../shared/network/client')
const SceneManagerXR = require('./SceneManagerXR')


const App = () => {
  const [connection, setConnection] = useState(null)
  const storeRef = useRef(null)

  useEffect(() => {
    RemoteDevice.connect()
    .then((SGConnection) => {
      const actionSanitizer = action => (
        action.type === 'ATTACHMENTS_SUCCESS' && action.payload ?
        { ...action, payload: { ...action.payload, value: '<<DATA>>' } } : action
      )
      const stateSanitizer = state => state.attachments ? { ...state, attachments: '<<ATTACHMENTS>>' } : state
      const composeEnhancers = composeWithDevTools({
        actionSanitizer,
        stateSanitizer,
        trace: true
      })
      const enhancer = composeEnhancers(
        applyMiddleware(thunkMiddleware, SGConnection.ClientMiddleware),
        // other store enhancers if any
      )
      storeRef.current = createStore(reducer,{...initialState}, enhancer)
      // storeRef.current = createStore(reducer, {...initialState}, applyMiddleware(thunkMiddleware, SGConnection.ClientMiddleware))
      window.$r = {
        store: storeRef.current
      }

      SGConnection.connectStore(storeRef.current)

      window.addEventListener("error", function (e) {
        SGConnection.log([e.error.message, e.error.stack])
        return false;
      })

      window.SG = SGConnection

      SGConnection.connectRequest()
      setConnection(SGConnection)
    })
    .catch(alert)
  }, [])

  if (!connection) {
    return <ProgressIntro value={0} delay={300} msg={'Connecting…'} />
  }

  return (
    <Provider store={storeRef.current}>
      <SceneManagerXR SGConnection={connection}/>
    </Provider>
  )
}

ReactDOM.render(
  <App/>,
  document.getElementById('main')
)
