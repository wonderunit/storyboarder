
const ReactDOM = require('react-dom')
const { ipcRenderer } = require('electron')
const { Suspense } = React = require('react')
const {reducer, initialState} = require('../../language-preferences/store')
const i18n = require('../../services/i18next.config')
const { createStore, applyMiddleware, compose } = require('redux')
const thunkMiddleware = require('redux-thunk').default
const {Provider} = require('react-redux')
const LanguagePreferences = require('../../language-preferences').default
const configureStore = function configureStore (preloadedState) {
  const store = createStore(
    reducer,
    preloadedState,
    applyMiddleware(thunkMiddleware),
    )
    return store
}
const store = configureStore({...initialState})

ipcRenderer.on("languageChanged", (event, lng) => {
  i18n.changeLanguage(lng)
})

ReactDOM.render(
  <Provider store={store}>
    <Suspense fallback="loading">
      <LanguagePreferences/>
    </Suspense>
  </Provider>

  , document.getElementById("main")
  )
