import log from '../../../shared/storyboarder-electron-log'
import React from 'react'
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
      return <div className="fatal-error-screen">
            <h1 className="fatal-error-screen__title">
            Uh oh. Shot Generator encountered an unexpected error and could not continue.
            </h1>
            <div className="fatal-error-screen__report">{  this.state.error.stack }</div>
        </div>
    }

    return this.props.children
  }
}

export default FatalErrorBoundary
