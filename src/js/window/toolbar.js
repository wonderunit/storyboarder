const EventEmitter = require('events').EventEmitter
const sketchPane = require('../sketchpane.js')

class Toolbar extends EventEmitter {
  constructor (el) {
    super()
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
    this.update()
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
      case 'add':
        this.emit('add')
        break
      case 'delete':
        this.emit('delete')
        break
      case 'duplicate':
        this.emit('duplicate')
        break
      case 'import':
        this.emit('import')
        break
      case 'print':
        this.emit('print')
        break
      
      // brushes
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
      case 'undo':
        this.emit('undo')
        break
      case 'redo':
        this.emit('redo')
        break

      default:
        console.log('toolbar selection', selection)
        break
    }
  }

  update () {
    switch (this.state.brush) {
      case 'light-pencil':
        sketchPane.setBrush(2,[200,220,255],5,50,'main')
        break
      case 'pencil':
        sketchPane.setBrush(1.5,[30,30,30],5,70,'main')
        break
      case 'pen':
        sketchPane.setBrush(3,[0,0,0],60,80,'main')
        break
      case 'brush':
        sketchPane.setBrush(20,[0,0,100],2,10,'main')
        break
      case 'eraser':
        sketchPane.setEraser()
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
