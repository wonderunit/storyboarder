const EventEmitter = require('events').EventEmitter

class Toolbar extends EventEmitter {
  constructor (el) {
    super()
    this.state = {}
    this.el = el
    this.setState({
      brush: 'light-pencil',
      transformMode: null,
      captions: true,
      currentBrushColor: null,
      grid: false,
      center: false,
      thirds: false,
      diagonals: false
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
    let target = event.target

    // interpret brush tool icon div clicks
    if (target.classList.contains('icon')) {
      target = target.parentNode
    }

    let selection = target.id.replace(/^toolbar-/, '')

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
        if (this.state.brush !== 'light-pencil') {
          this.setState({ brush: 'light-pencil' })
          this.emit('light-pencil')
        }
        break
      case 'pencil':
        if (this.state.brush !== 'pencil') {
          this.setState({ brush: 'pencil' })
          this.emit('pencil')
        }
        break
      case 'pen':
        if (this.state.brush !== 'pen') {
          this.setState({ brush: 'pen' })
          this.emit('pen')
        }
        break
      case 'brush':
        if (this.state.brush !== 'brush') {
          this.setState({ brush: 'brush' })
          this.emit('brush')
        }
        break
      case 'eraser':
        if (this.state.brush !== 'eraser') {
          this.setState({ brush: 'eraser' })
          this.emit('eraser')
        }
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
        this.setState({ grid: !this.state.grid })
        this.emit('grid', this.state.grid)
        break
      case 'center':
        this.setState({ center: !this.state.center })
        this.emit('center', this.state.center)
        break
      case 'thirds':
        this.setState({ thirds: !this.state.thirds })
        this.emit('thirds', this.state.thirds)
        break
      case 'diagonals':
        this.setState({ diagonals: !this.state.diagonals })
        this.emit('diagonals', this.state.diagonals)
        break
      case 'onion':
        this.emit('onion')
        break
      case 'captions':
        this.setState({ captions: !this.state.captions })
        this.emit('captions')
        break

      default:
        console.log('toolbar selection', selection)
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
    
    let btnCaptions = this.el.querySelector('#toolbar-captions')
    if (this.state.captions) {
      btnCaptions.classList.add('active')
    } else {
      btnCaptions.classList.remove('active')
    }

    let gridEl = this.el.querySelector('#toolbar-grid')
    let centerEl = this.el.querySelector('#toolbar-center')
    let thirdsEl = this.el.querySelector('#toolbar-thirds')
    let diagonalsEl = this.el.querySelector('#toolbar-diagonals')
    gridEl.classList.toggle('active', this.state.grid)
    centerEl.classList.toggle('active', this.state.center)
    thirdsEl.classList.toggle('active', this.state.thirds)
    diagonalsEl.classList.toggle('active', this.state.diagonals)

    if (this.state.currentBrushColor) {
      this.el.querySelector('#toolbar-current-color').style.setProperty('--color3', this.state.currentBrushColor.toCSS())
    }
  }
}

module.exports = Toolbar
