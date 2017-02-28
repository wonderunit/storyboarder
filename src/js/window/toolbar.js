const EventEmitter = require('events').EventEmitter
const util = require('../wonderunit-utils.js')

class Toolbar extends EventEmitter {
  constructor (el) {
    super()
    this.state = {}
    this.el = el
    this.setState({
      brush: 'light-pencil',
      transformMode: null
    })
    this.onButtonSelect = this.onButtonSelect.bind(this)
    this.attachedCallback(this.el)
  }

  setState (newState) {
    let oldState = util.shallowCopy(this.state)
    this.state = Object.assign(this.state, newState)
    this.update(oldState)
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
      // board operations
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

      case 'trash':
        this.emit('trash')
        break
      case 'fill':
        this.emit('fill')
        break

      case 'move':
        this.state.transformMode == 'move'
          ? this.emit('cancelTransform')
          : this.emit('move')
        break
      case 'scale':
        this.state.transformMode == 'scale'
          ? this.emit('cancelTransform')
          : this.emit('scale')
        break

      // undo/redo
      case 'undo':
        this.emit('undo')
        break
      case 'redo':
        this.emit('redo')
        break

      case 'current-color':
        this.emit('current-color')
        break
      case 'palette-colorA':
        this.emit('palette-colorA')
        break
      case 'palette-colorB':
        this.emit('palette-colorB')
        break
      case 'palette-colorC':
        this.emit('palette-colorC')
        break

      case 'brush-size':
        this.emit('brush-size')
        break

      case 'grid':
        this.emit('grid')
        break
      case 'center':
        this.emit('center')
        break
      case 'thirds':
        this.emit('thirds')
        break
      case 'perspective':
        this.emit('perspective')
        break
      case 'onion':
        this.emit('onion')
        break
      case 'caption':
        this.emit('caption')
        break

      default:
        console.log('toolbar selection', selection)
        break
    }
  }

  update (oldState) {
    if (oldState.brush !== this.state.brush) {
      switch (this.state.brush) {
        case 'light-pencil':
          this.emit('light-pencil')
          break
        case 'pencil':
          this.emit('pencil')
          break
        case 'pen':
          this.emit('pen')
          break
        case 'brush':
          this.emit('brush')
          break
        case 'eraser':
          this.emit('eraser')
          break
      }
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

    let btnMove = this.el.querySelector('#toolbar-move')
    let btnScale = this.el.querySelector('#toolbar-scale')
    switch (this.state.transformMode) {
      case 'move':
        btnMove.classList.add('active')
        btnScale.classList.remove('active')
        break
      case 'scale':
        btnScale.classList.add('active')
        btnMove.classList.remove('active')
        break
      default:
        btnScale.classList.remove('active')
        btnMove.classList.remove('active')
        break
    }
  }
}

module.exports = Toolbar
