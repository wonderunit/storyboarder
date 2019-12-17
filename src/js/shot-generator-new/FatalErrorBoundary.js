const log = require('electron-log')
const h = require('../utils/h')

class FatalErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      hasError: false,
      error: null
    }
  }

  static getDerivedStateFromError (error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    log.error(error, info)
  }

  render() {
    if (this.state.hasError) {
      return h(
        ['div.fatal-error-screen',
          [
            'h1.fatal-error-screen__title',
            `Uh oh. Shot Generator encountered an unexpected error and could not continue.`
          ],
          [
            'div.fatal-error-screen__report',
            this.state.error.stack
          ]
        ]
      )
    }

    return this.props.children
  }
}

module.exports = FatalErrorBoundary