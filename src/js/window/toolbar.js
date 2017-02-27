class Toolbar {
  constructor (el) {
    this.state = {}
    this.el = el
    this.setState({
      brush: 'light-pencil'
    })
    this.onButtonSelect = this.onButtonSelect.bind(this)
    this.attachedCallback(this.el)
  }

  setState (newState) {
    this.state = Object.assign(this.state, newState)
    this.render()
  }

  attachedCallback () {
    for (let buttonEl of this.el.querySelectorAll('.button')) {
      buttonEl.addEventListener('pointerdown', this.onButtonSelect)
    }
  }

  // TODO cleanup, remove listeners
  // detachedCallback () {}
  
  onButtonSelect (event) {
    let selection = event.target.id.replace(/^toolbar-/, '')

    switch (selection) {
      case 'light-pencil':
        this.setState({ brush: 'light-pencil' })
        break
      case 'pencil':
        this.setState({ brush: 'pencil' })
        break
      case 'pen':
        this.setState({ brush: 'pen' })
        break
      case 'brush':
        this.setState({ brush: 'brush' })
        break
      case 'eraser':
        this.setState({ brush: 'eraser' })
        break
    }
  }
  
  render () {
    let brushesEls = this.el.querySelectorAll('.button[data-group=brushes]')
    for (let brushEl of brushesEls) {
      if (brushEl.id == `toolbar-${this.state.brush}`) {
        brushEl.classList.add('active')
      } else {
        brushEl.classList.remove('active')
      }
    }
  }
}

module.exports = Toolbar
