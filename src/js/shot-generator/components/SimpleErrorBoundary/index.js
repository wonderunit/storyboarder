import React from 'react'
class SimpleErrorBoundary extends React.Component {
    constructor (props) {
      super(props)
      this.state = {
        hasError: false,
        error: null
      }
    }
  
    static getDerivedStateFromError (error) {
      return {
        hasError: true,
        error
      }
    }
  
    componentDidCatch (error, info) {
      console.error(error)
      console.error(info)
    }
  
    render() {
      if (this.state.hasError) {
        return (
          <></>
        )
      }
  
      return this.props.children
    }
  }
  
export default SimpleErrorBoundary
  