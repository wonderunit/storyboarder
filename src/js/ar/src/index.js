import React from "react"
import ReactDOM from 'react-dom'
import {Provider} from 'react-redux'

import {connect} from './helpers/store'

import App from "./components/App"
import './index.scss'

connect().then((store) => {
  ReactDOM.render(
    <Provider store={store}>
      <App/>
    </Provider>,
    document.getElementById('root')
  )
})
