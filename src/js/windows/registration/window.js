require('electron-redux/preload')
const { ipcRenderer } = require('electron')
const { app } = remote = require('@electron/remote')
const JWT = require('jsonwebtoken')
const moment = require('moment')
const { machineIdSync } = require('node-machine-id')
const fs = require('fs')
const path = require('path')
const trash = require('trash')

const configureStore = require('../src/js/shared/store/configureStore')
const store = configureStore()

const fetchWithTimeout = require('../src/js/utils/fetchWithTimeout')

const { API_ROOT } = require('../src/js/models/license')
const SIGN_UP_URI = 'https://app.wonderunit.com/signup'


let view

const licenseKeyPath = path.join(app.getPath('userData'), 'license.key')

const authSelector = state => state.auth['app.wonderunit.com'] || {}
const hasValidAuthToken = () => {
  if (authSelector(store.getState()).token == null) return false
  return JWT.decode(authSelector(store.getState()).token).exp > Date.now() / 1000
}

const handleError = err => {
  console.error(err)
  if (err.message === 'Failed to fetch') {
    window.alert('Whoops! Couldn’t connect to the server. Please check your network connection and try again.\nError: ' + err.message)
  } else {
    window.alert('Whoops! An error occurred.\n' + err.message)
  }
}
const init = () => {
  // document.addEventListener('keydown', event => {
  //   if (event.key === 'Escape') {
  //     event.preventDefault()
  //     remote.getCurrentWindow().hide()
  //   }
  // })

  let win = remote.getCurrentWindow()
  win.webContents.on('before-input-event', (event, input) => {
    // NOTE commented out to work better with the Stripe form
    // if we are focused on an input
    // if (document.activeElement && document.activeElement.tagName === 'INPUT') {

      // only enable application menu keyboard shortcuts when Ctrl / Cmd are down.
      win.webContents.setIgnoreMenuShortcuts(!input.control && !input.meta)

    // }
  })

  let onSignOut = () => {
    init()
  }

  let onSignInComplete = () => {
    init()
  }

  let onInstallRequested = ({ subscriptionId }) => {
    if (view) view.dispose()
    view = new LicenseInstallView({ subscriptionId })
    view.render(document.body)
  }

  let onPaymentApproved = ({ subscriptionId }) => {
    onInstallRequested({ subscriptionId })
  }

  if (view) view.dispose()

  if (hasValidAuthToken()) {
    view = new HomeView({
      store,
      onSignOut,
      onInstallRequested,
      onPaymentApproved
    })
    view.render(document.body)
  } else {
    view = new SignInView({
      store,
      onSignInComplete
    })
    view.render(document.body)
  }
}

class SignInView {
  constructor ({ store, onSignInComplete }) {
    this.store = store
    this.parentEl = undefined
    this.onSignInComplete = onSignInComplete
  }
  render (parentEl) {
    this.parentEl = parentEl

    let t = document.querySelector('#signin-form-template')
    let clone = document.importNode(t.content, true)

    let hostname = new window.URL(SIGN_UP_URI).hostname
    clone.querySelector('a[rel="external"]').href = SIGN_UP_URI
    clone.querySelector('a[rel="external"]').innerHTML = `Sign Up at ${hostname}`
    clone.querySelector('a[rel="external"]').addEventListener('click', event => {
      event.preventDefault()
      remote.shell.openExternal(event.target.href)
    })

    clone.querySelector('form').addEventListener('submit', this.onSubmit.bind(this))

    this.parentEl.appendChild(clone)
    this.el = this.parentEl.querySelector('#signin-form')

    if (store.getState().license.licenseId) {
      let div = document.createElement('div')
      div.classList.add('registration-window__topbar')
      div.innerHTML = `Registered To: <strong>${store.getState().license.registeredTo}</strong>`
      this.el.insertBefore(div, this.el.firstChild)
    }
  }
  lock (event) {
    event.target.querySelector('button').disabled = true
    event.target.querySelector('button').innerHTML = 'Signing In …'
  }
  unlock (event) {
    event.target.querySelector('button').disabled = false
    event.target.querySelector('button').innerHTML = 'Sign In'
  }
  async onSubmit (event) {
    event.preventDefault()

    this.lock(event)    

    let authUri = `${API_ROOT}/users/authenticate`

    let params = new URLSearchParams()
    params.set('email', event.target.querySelector('[name=email]').value)
    params.set('password', event.target.querySelector('[name=password]').value)
  
    try {      
      let res = await fetchWithTimeout(
        authUri,
        {
          method: 'POST',
          body: params
        },
        5000
      )
  
      if (res.status == 403) {
        window.alert('That email/password combination was not accepted.')
        this.unlock(event)
        return
      }
  
      if (res.status == 200) {
        let json = await res.json()
        if (!json.token) {
          throw new Error('No token')
        }
    
        event.target.querySelector('button').disabled = true
        event.target.querySelector('button').innerHTML = 'Signed In!'

        store.dispatch({
          type: 'SET_AUTH',
          payload: {
            service: 'app.wonderunit.com',
            ...json
          }
        })
        // wait for async dispatch to complete
        setTimeout(() => this.onSignInComplete(), 100)
      } else {
        throw new Error(`Server returned HTTP status code ${req.status}`)
      }
    } catch (err) {
      handleError(err)
      this.unlock(event)
    }
  }

  dispose () {
    this.parentEl.removeChild(this.el)
  }
}

// TODO split into SubscriberView vs NonSubscriberView
// TODO split SubscriberView into LicensedView vs UnLicensedView
class HomeView {
  constructor ({ store, onSignOut, onInstallRequested, onPaymentApproved }) {
    this.store = store
    this.parentEl = undefined
    this.onSignOut = onSignOut
    this.onInstallRequested = onInstallRequested
    this.onPaymentApproved = onPaymentApproved
  }
  async render (parentEl) {
    this.parentEl = parentEl

    let subscriptions
    try {
      subscriptions = await (await fetchWithTimeout(`${API_ROOT}/subscriptions`, {
        headers: new Headers({
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authSelector(store.getState()).token}`
        })
      }, 5000)).json()
    } catch (err) {
      handleError(err)
      return
    }

    // ignore canceled subscriptions
    subscriptions = subscriptions.filter(s => s.stripe_status !== 'canceled')

    if (subscriptions.length) {
      let t = document.querySelector('#home-subscriptions-template')
      let clone = document.importNode(t.content, true)

      clone.querySelector('a[data-js="sign-out"]').addEventListener('click', this.onSignOutClick.bind(this))

      this.parentEl.appendChild(clone)
      this.el = this.parentEl.querySelector('#home')

      let asItem = subscription => `
        <tr>
          <td>${moment(subscription.start).format('DD MMM YYYY')}</td>
          <td>${subscription.expires != null
            ? moment(subscription.expires).format('DD MMM YYYY')
            : "Never"
          }</td>
          <td>
            <a  href="#"
                data-subscription-id="${subscription.subscription_id}"
                data-js="install"
                style="color: blue">
                Install
                </a>
          </td>
        </tr>
      `

      let license = store.getState().license

      this.el.querySelector('h1[data-js="heading"]').innerHTML = 'Hello!'
      this.el.querySelector('div[data-js="greeting"]').innerHTML = `
        <p>Thank you for supporting Storyboarder.</p>
        ${
          (license != null && license.licenseId != null)
            ? `
              <p>This machine has a Storyboarder license registered to:</p>
              <p><strong>${license.registeredTo}</strong></p>
              <p>Thank you for your support!</p>
              <p>Expires: ${license.licenseExpiration == null ? 'Never' : license.licenseExpiration}</p>
              <p>
                <a href="#" data-js="uninstall">Remove license from this machine</a>
                <br/><br/>
              </p>
            `
            : `
            <p>You have a license, but it is not installed on this machine yet.</p>
            <p>Your Subscription${subscriptions.length > 1 ? 's' : ''}:</p>
            <table style="width: 100%;">
              <tr style="opacity: 0.6">
                <td>Since</td>
                <td>Expires</td>
                <td></td>
              </tr>
              ${subscriptions.map(asItem).join('\n')}
            </table>
            `
        }
      `
      let uninstallEl = this.el.querySelector('a[data-js="uninstall"]')
      if (uninstallEl) {
        uninstallEl.addEventListener('click', this.onUninstallClick.bind(this))
      }

      this.el.querySelectorAll('a[data-js="install"]').forEach(el =>
        el.addEventListener('click', this.onInstallClick.bind(this))
      )

    } else {
      let t = document.querySelector('#home-no-subscriptions-template')
      let clone = document.importNode(t.content, true)

      this.parentEl.appendChild(clone)
      this.el = this.parentEl.querySelector('#home')

      try {
        let productsResponse = await fetchWithTimeout(`${API_ROOT}/products`, {
          headers: new Headers({
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authSelector(store.getState()).token}`
          })
        }, 5000)
        let productsJson = await productsResponse.json()
        let product = productsJson.find(item => item.name === 'Storyboarder')
        if (!product) {
          throw new Error('Could not retrieve data from server')
        }

        let plansResponse = await fetchWithTimeout(`${API_ROOT}/plans?product_id=${product.product_id}`, {
          headers: new Headers({
            'Content-Type': 'application/json'
          })
        }, 5000)

        let plans = await plansResponse.json()

        let forms = await Promise.all(plans.map(async plan => {
          let product_id = product.product_id
          let plan_id = plan.plan_id
          let paymentResponse = await fetchWithTimeout(`${API_ROOT}/payment-form?product_id=${product_id}&plan_id=${plan_id}`, {
            headers: new Headers({
              'Content-Type': 'application/json'
            })
          }, 5000)
          return await paymentResponse.json()
        }))

        // https://stripe.com/docs/checkout#integration-custom
        for (let form of forms) {
          let formEl = document.createElement('button')
          formEl.href = '#'
          formEl.classList.add('registration-window__button')
          formEl.textContent = form.label

          let handler = StripeCheckout.configure({
            key: form.stripePublishableKey,
            image: form.image,
            locale: 'auto',
            token: async (token) => {
              formEl.disabled = true
              document.body.style.cursor = 'wait'

              try {
                let paymentResponse = await fetchWithTimeout(form.action, {
                  method: 'POST',
                  headers: new Headers({
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authSelector(store.getState()).token}`
                  }),
                  body: JSON.stringify({
                    stripeToken: token.id,
                    user_id: JWT.decode(authSelector(store.getState()).token).user_id,
                    product_id: form.product.product_id,
                    plan_id: form.plan.plan_id
                  })
                }, 5000)
                let paymentJson = await paymentResponse.json()

                // console.log('got response!')
                // console.log(paymentJson)

                alert('Approved! Thanks for your support!')

                document.body.style.cursor = ''
                formEl.disabled = false

                this.onPaymentApproved({
                  subscriptionId: paymentJson.subscription_id
                })

              } catch (err) {
                handleError(err)

                document.body.style.cursor = ''
                formEl.disabled = false
                return
              }
            }
          })

          formEl.addEventListener('click', function (e) {
            handler.open({
              name: form.name,
              description: form.description,
              amount: form.amount
            })
            e.preventDefault()
          })

          // handler.close()

          this.el.querySelector('div[data-js="plans"]').appendChild(formEl)
        }

      } catch (err) {
        handleError(err)
        return
      }
    }

    this.el.querySelector('a[data-js="sign-out"]').addEventListener('click', this.onSignOutClick.bind(this))
  }
  onSignOutClick (event) {
    event.preventDefault()
    store.dispatch({ type: 'CLEAR_AUTH' })
    // wait for async dispatch to complete
    setTimeout(() => this.onSignOut(), 100)
  }
  async onUninstallClick (event) {
    event.preventDefault()
    if (confirm('Are you sure you want to remove this license key from this machine?')) {
      // TODO should we ping the server?
      await trash(licenseKeyPath)
      alert('License removed. Please restart Storyboarder.')
      remote.getCurrentWindow().hide()
    }
  }
  onInstallClick (event) {
    event.preventDefault()
    let subscriptionId = event.target.dataset.subscriptionId
    this.onInstallRequested({ subscriptionId })
  }
  dispose () {
    this.parentEl.removeChild(this.el)
  }
}

class LicenseInstallView {
  constructor ({ subscriptionId }) {
    this.subscriptionId = subscriptionId
    this.machineId = machineIdSync({
      // compare original values (not SHA-256'd)
      original: true
    })
  }
  async render (parentEl) {
    let license, key

    this.parentEl = parentEl
    let t = document.querySelector('#license-installer-template')
    let clone = document.importNode(t.content, true)
    this.parentEl.appendChild(clone)
    this.el = this.parentEl.querySelector('#license-installer')

    let output = this.el.querySelector('div[data-js="output"]')
    output.innerHTML += 'Requesting License Grant …<br/>'

    try {
      let licenseResponse = await fetchWithTimeout(`${API_ROOT}/licenses`, {
        method: 'POST',
        headers: new Headers({
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authSelector(store.getState()).token}`
        }),
        body: JSON.stringify({
          user_id: JWT.decode(authSelector(store.getState()).token).user_id,
          machine_id: this.machineId,
          subscription_id: this.subscriptionId
        })
      }, 5000)

      if (licenseResponse.status === 200) {
        output.innerHTML += 'Granted OK …<br/>'
        license = await licenseResponse.json()
      } else {
        throw new Error('Could not obtain license grant')
      }

      output.innerHTML += 'Downloading License …<br/>'

      let keyResponse = await fetchWithTimeout(`${API_ROOT}/licenses/${license.license_id}/license.key`, {
        method: 'GET',
        headers: new Headers({
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authSelector(store.getState()).token}`
        })
      }, 5000)

      if (keyResponse.status === 200) {
        output.innerHTML += 'Installing …<br/>'
        key = await keyResponse.text()

        // if exists, warn
        let shouldOverwrite = true
        if (fs.existsSync(licenseKeyPath)) {
          if (confirm('Overwrite existing license key?')) {
            shouldOverwrite = true
          } else {
            shouldOverwrite = false
          }
        }
        if (shouldOverwrite) {
          fs.writeFileSync(licenseKeyPath, key, { encoding: 'utf8' })
          output.innerHTML += 'Done! Please restart Storyboarder to finish installation.'
        } else {
          output.innerHTML += 'Cancelled.'
        }

      } else {
        throw new Error('Could not install key')
      }

    } catch (err) {
      handleError(err)
      output.innerHTML += 'Server Error :(<br/>'
      return
    }

  }
  dispose () {
    this.parentEl.removeChild(this.el)
  }
}

setTimeout(() => {
  init()
}, 250)
