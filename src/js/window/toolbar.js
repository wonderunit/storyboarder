const EventEmitter = require('events').EventEmitter
const Color = require('color-js')

const util = require('../utils/index.js')

const BRUSH_PENCIL = 'pencil'
const BRUSH_LIGHT_PENCIL = 'light-pencil'
const BRUSH_PEN = 'pen'
const BRUSH_BRUSH = 'brush'
const BRUSH_NOTE_PEN = 'note-pen'
const BRUSH_ERASER = 'eraser'

const initialState = {
  transformMode: null,
  captions: true,

  brush: null,

  brushes: {
    [BRUSH_PENCIL]: {
      kind: BRUSH_PENCIL,
      size: 7,
      spacing: 0.25,
      flow: 0.4,
      hardness: 0.5,
      opacity: 0.4,
      color: Color('#222222'),
      palette: [
        Color('#ff0000'), Color('#00ff00'), Color('#0000ff')
      ]
    },
    [BRUSH_LIGHT_PENCIL]: {
      kind: BRUSH_LIGHT_PENCIL,
      size: 20,
      spacing: 0.12,
      flow: 0.4,
      hardness: 0.8,
      opacity: 0.3,
      color: Color('#ddddff'),
      palette: [
        Color('#ff40ff'), Color('#00ff00'), Color('#0000ff')
      ]
    },
    [BRUSH_PEN]: {
      kind: BRUSH_PEN,
      size: 20,
      spacing: 0.02,
      flow: 1,
      hardness: 0.7,
      opacity: 0.9,
      color: Color('#000000'),
      palette: [
        Color('#ff7044'), Color('#00ff00'), Color('#0000ff')
      ]
    },
    [BRUSH_BRUSH]: {
      kind: BRUSH_BRUSH,
      size: 100,
      spacing: 0.2,
      flow: 0.7,
      hardness: 0,
      opacity: 0.2,
      color: Color('#000064'),
      palette: [
        Color('#ffa099'), Color('#00ff00'), Color('#0000ff')
      ]
    },
    [BRUSH_NOTE_PEN]: {
      kind: BRUSH_NOTE_PEN,
      size: 10,
      color: '#f00',
      spacing: 0.02,
      flow: 0.9,
      hardness: 0.9,
      opacity: 0.8,
      color: Color('#ff0000'),
      palette: [
        Color('#ff0000'), Color('#ff69b4'), Color('#821b4e')
      ]
    },
    [BRUSH_ERASER]: {
      kind: BRUSH_ERASER,
      size: 4,

      spacing: 0.2,
      flow: 1.0,
      hardness: 0,
      opacity: 1.0,

      color: Color('#ffffff'),
      palette: [
        Color('#ffffff'), Color('#ffffff'), Color('#ffffff')
      ]
    }
  },

  grid: false,
  center: false,
  thirds: false,
  diagonals: false
}

class Toolbar extends EventEmitter {
  constructor (el) {
    super()
    this.state = initialState
    this.el = el
    this.swatchTimer = null
    this.swatchDelay = 2000

    this.onButtonDown = this.onButtonDown.bind(this)
    this.onSwatchUp = this.onSwatchUp.bind(this)
    this.onSwatchDown = this.onSwatchDown.bind(this)
    this.onBrushSizePointerDown = this.onBrushSizePointerDown.bind(this)

    this.attachedCallback(this.el)

    // this.setState({ brush: BRUSH_PENCIL })
  }

  setState (newState) {
    // TODO track actual change, not just presence of key
    //      track only size change vs. entire brush change
    let brushChanged
    if (newState.brush ||
        newState.brushes) {
      brushChanged = true
    }

    this.state = Object.assign(this.state, newState)

    if (brushChanged) {
      this.emit('brush', this.state.brush, this.getBrushOptions(this.state))
    }

    this.render()
  }

  changeBrushSize (direction) {
    this.setState(
      Object.assign(
        this.state,
        {
          brushes: Object.assign(
            this.state.brushes,
            {
              [this.state.brush]: Object.assign(
                this.state.brushes[this.state.brush],
                {
                  size: this.state.brushes[this.state.brush].size += direction // TODO clamp
                }
              )
            }
          )
        }
      )
    )
  }

  changeCurrentColor (color) {
    this.setState(
      Object.assign(
        this.state,
        {
          brushes: Object.assign(
            this.state.brushes,
            {
              [this.state.brush]: Object.assign(
                this.state.brushes[this.state.brush],
                {
                  color: this.state.brushes[this.state.brush].color = color
                }
              )
            }
          )
        }
      )
    )
  }

  changePaletteColor (brush, index, color) {
    // NOTE ignores passed brush and uses current brush,
    //      in case we changed since we invoked the color picker
    
    const palette = this.state.brushes[this.state.brush].palette.concat()
    palette[index] = color
    
    this.setState(
      Object.assign(
        this.state,
        {
          brushes: Object.assign(
            this.state.brushes,
            {
              [this.state.brush]: Object.assign(
                this.state.brushes[this.state.brush],
                {
                  palette
                }
              )
            }
          )
        }
      )
    )
  }

  attachedCallback () {
    const immediateButtons = [...this.el.querySelectorAll('.button:not([id^="toolbar-palette-color"])')]
    const swatchButtons = [...this.el.querySelectorAll('.button[id^="toolbar-palette-color"]')]
    const brushSizeControlsEl = this.el.querySelector('#toolbar .toolbar-brush-size-controls')

    for (let buttonEl of immediateButtons) {
      buttonEl.addEventListener('pointerdown', this.onButtonDown)
    }

    for (let buttonEl of swatchButtons) {
      buttonEl.addEventListener('pointerup', this.onSwatchUp)
      buttonEl.addEventListener('pointerdown', this.onSwatchDown)
    }

    brushSizeControlsEl.addEventListener('pointerdown', this.onBrushSizePointerDown)
  }

  // TODO cleanup, remove listeners
  // detachedCallback () {}

  getEventTargetSelection (target) {
    // interpret brush tool icon div clicks
    if (target.classList.contains('icon')) {
      target = target.parentNode
    }

    return target.id.replace(/^toolbar-/, '')
  }
  
  getBrushOptions (state) {
    return state.brushes[state.brush]
  }

  onButtonDown (event) {
    let selection = this.getEventTargetSelection(event.target)

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
          this.emit('brush', this.state.brush, this.getBrushOptions(this.state))
        }
        break
      case 'pencil':
        if (this.state.brush !== 'pencil') {
          this.setState({ brush: 'pencil' })
          this.emit('brush', this.state.brush, this.getBrushOptions(this.state))
        }
        break
      case 'pen':
        if (this.state.brush !== 'pen') {
          this.setState({ brush: 'pen' })
          this.emit('brush', this.state.brush, this.getBrushOptions(this.state))
        }
        break
      case 'brush':
        if (this.state.brush !== 'brush') {
          this.setState({ brush: 'brush' })
          this.emit('brush', this.state.brush, this.getBrushOptions(this.state))
        }
        break
      case 'note-pen':
        if (this.state.brush !== 'note-pen') {
          this.setState({ brush: 'note-pen' })
          this.emit('brush', this.state.brush, this.getBrushOptions(this.state))
        }
        break
      case 'eraser':
        if (this.state.brush !== 'eraser') {
          this.setState({ brush: 'eraser' })
          // just to set the size
          this.emit('brush', this.state.brush, this.getBrushOptions(this.state))
        }
        break

      case 'trash':
        this.emit('trash')
        break
      case 'fill':
        this.emit('fill', this.state.brushes[this.state.brush].color)
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
        if (this.state.brush == 'eraser') break
        this.emit('current-color-picker', this.state.brushes[this.state.brush].color)
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

  onSwatchDown (event) {
    if (this.state.brush == 'eraser') return
    clearTimeout(this.swatchTimer)
    this.swatchTimer = setTimeout(this.onSwatchColorPicker.bind(this, event.target), this.swatchDelay)
  }
  
  onSwatchColorPicker (target) {
    clearTimeout(this.swatchTimer)
    this.swatchTimer = null

    let selection = this.getEventTargetSelection(target)

    let brush = this.state.brush
    let index = ['palette-colorA', 'palette-colorB', 'palette-colorC'].indexOf(selection)
    let color = this.getCurrentPalette()[index]

    switch(selection) {
      case 'palette-colorA':
      case 'palette-colorB':
      case 'palette-colorC':
        this.emit('palette-color-picker', color, target, brush, index)
        break
    }
  }

  onSwatchUp (event) {
    if (this.state.brush == 'eraser') return

    if (this.swatchTimer) {
      // timer is still running so we never showed the Color Picker
      let selection = this.getEventTargetSelection(event.target)
      switch(selection) {
        case 'palette-colorA':
          this.emit('current-set-color', this.getCurrentPalette()[0])
          break
        case 'palette-colorB':
          this.emit('current-set-color', this.getCurrentPalette()[1])
          break
        case 'palette-colorC':
          this.emit('current-set-color', this.getCurrentPalette()[2])
          break
      }
    }
    clearTimeout(this.swatchTimer)
  }

  getCurrentPalette () {
    return this.state.brushes[this.state.brush].palette
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

    if (this.state.brushes[this.state.brush].color) {
      this.el.querySelector('#toolbar-current-color .icon').style.backgroundColor = this.state.brushes[this.state.brush].color.toCSS()

      this.el.querySelector('#toolbar-fill').style.setProperty('--color3', this.state.brushes[this.state.brush].color.toCSS())
    }

    const palette = this.getCurrentPalette()

    if (palette) {
      const paletteIcons = ['A', 'B', 'C'].map(letter => this.el.querySelector(`#toolbar-palette-color${letter} .icon`))
      paletteIcons[0].style.backgroundColor = palette[0].toCSS()
      paletteIcons[1].style.backgroundColor = palette[1].toCSS()
      paletteIcons[2].style.backgroundColor = palette[2].toCSS()
    }

    const brushSizeEl = this.el.querySelector('.toolbar-brush-size-controls_val')
    const brushSizeValue = this.state.brushes[this.state.brush].size
    brushSizeEl.innerHTML = (Math.round(brushSizeValue * 10) / 10).toString()
  }
  
  onBrushSizePointerDown (event) {
    const pos = event.layerX / event.target.getBoundingClientRect().width
    const direction = pos > 0.5 ? 1 : -1
    this.changeBrushSize(direction)
  }
}

module.exports = Toolbar
