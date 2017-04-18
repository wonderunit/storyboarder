const EventEmitter = require('events').EventEmitter
const Color = require('color-js')

const util = require('../utils/index.js')
const sfx = require('../wonderunit-sound.js')

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
      color: Color('#121212'),
      palette: [
        Color('#373737'), Color('#223131'), Color('#121212')
      ]
    },
    [BRUSH_LIGHT_PENCIL]: {
      kind: BRUSH_LIGHT_PENCIL,
      size: 20,
      spacing: 0.12,
      flow: 0.4,
      hardness: 0.8,
      opacity: 0.3,
      color: Color('#90CBF9'),
      palette: [
        Color('#CFCFCF'), Color('#9FA8DA'), Color('#90CBF9')
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
        Color('#373737'), Color('#223131'), Color('#000000')
      ]
    },
    [BRUSH_BRUSH]: {
      kind: BRUSH_BRUSH,
      size: 100,
      spacing: 0.2,
      flow: 0.7,
      hardness: 0,
      opacity: 0.2,
      color: Color('#9E9E9E'),
      palette: [
        Color('#4DABF5'), Color('#607D8B'), Color('#9E9E9E')
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
      color: Color('#F44336'),
      palette: [
        Color('#4CAF50'), Color('#FF9800'), Color('#F44336')
      ]
    },
    [BRUSH_ERASER]: {
      kind: BRUSH_ERASER,
      size: 30,

      spacing: 0.2,
      flow: 1.0,
      hardness: 0.9,
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
    this.onButtonOver = this.onButtonOver.bind(this)
    this.onSwatchUp = this.onSwatchUp.bind(this)
    this.onSwatchDown = this.onSwatchDown.bind(this)
    this.onBrushSizePointerDown = this.onBrushSizePointerDown.bind(this)

    this.attachedCallback(this.el)
  }

  setState (newState) {
    this.state = Object.assign(this.state, newState)
    if (newState.brush) {
      // the brush changed
      this.emit('brush', this.state.brush, this.getBrushOptions())
    }

    this.render()
  }

  changeBrushSize (direction, fine = false) {
    let min = 1
    let max = 256
    let currSize = this.state.brushes[this.state.brush].size

    if (fine) {
      currSize += direction
    } else {
      if (currSize < 5) {
        currSize += direction
      } else {
        currSize *= direction > 0 ? 1.2 : 0.8
      }
    }

    if (currSize < min) currSize = min
    if (currSize > max) currSize = max

    this.state.brushes[this.state.brush].size = currSize

    this.emit('brush:size', this.getBrushOptions().size)
    this.render()
  }

  changeCurrentColor (color) {
    this.state.brushes[this.state.brush].color = color
    this.emit('brush:color', this.getBrushOptions().color)
    this.render()
  }

  changePaletteColor (brush, index, color) {
    // NOTE ignores passed brush and uses current brush,
    //      in case we changed since we invoked the color picker
    this.state.brushes[this.state.brush].palette[index] = color
    this.render()
  }

  attachedCallback () {
    const immediateButtons = [...this.el.querySelectorAll('.button:not([id^="toolbar-palette-color"])')]
    const swatchButtons = [...this.el.querySelectorAll('.button[id^="toolbar-palette-color"]')]
    const brushSizeControlsEl = this.el.querySelector('#toolbar .toolbar-brush-size-controls')
    const allControls = [].concat(
      immediateButtons,
      swatchButtons,
      [brushSizeControlsEl]
    )

    for (let buttonEl of immediateButtons) {
      buttonEl.addEventListener('pointerdown', this.onButtonDown)
    }

    for (let buttonEl of swatchButtons) {
      buttonEl.addEventListener('pointerup', this.onSwatchUp)
      buttonEl.addEventListener('pointerdown', this.onSwatchDown)
    }

    brushSizeControlsEl.addEventListener('pointerdown', this.onBrushSizePointerDown)


    for (let el of allControls) {
      el.addEventListener('pointerenter', this.onButtonOver)
    }
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
  
  getBrushOptions () {
    let curr = this.state.brushes[this.state.brush]
    return {
      kind: curr.kind,
      size: curr.size,
      spacing: curr.spacing,
      flow: curr.flow,
      hardness: curr.hardness,
      opacity: curr.opacity,
      color: curr.color.clone(),
      palette: curr.palette.map(color => color.clone())
    }
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
        }
        break
      case 'pencil':
        if (this.state.brush !== 'pencil') {
          this.setState({ brush: 'pencil' })
        }
        break
      case 'pen':
        if (this.state.brush !== 'pen') {
          this.setState({ brush: 'pen' })
        }
        break
      case 'brush':
        if (this.state.brush !== 'brush') {
          this.setState({ brush: 'brush' })
        }
        break
      case 'note-pen':
        if (this.state.brush !== 'note-pen') {
          this.setState({ brush: 'note-pen' })
        }
        break
      case 'eraser':
        if (this.state.brush !== 'eraser') {
          this.setState({ brush: 'eraser' })
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
        this.toggleCaptions()
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
    const brushSizeValue = this.getBrushOptions().size
    brushSizeEl.innerHTML = Math.round(brushSizeValue)
  }

  // left or right?
  getDirectionOnTarget (event) {
    const pos = event.layerX / event.target.getBoundingClientRect().width
    return pos > 0.5 ? 1 : -1
  }
  
  onBrushSizePointerDown (event) {
    let direction = this.getDirectionOnTarget(event)
    this.changeBrushSize(direction, true)
  }

  toggleCaptions () {
    this.setState({ captions: !this.state.captions })
    this.emit('captions')
  }
  
  onButtonOver (event) {
    sfx.rollover()
    //
    // for targetting individual inc/dec
    //
    // if (event.target.classList.contains('toolbar-brush-size-controls')) {
    //   let direction = this.getDirectionOnTarget(event)
    //   if (direction == -1) {
    //     // left
    //     // console.log('dec')
    //   } else {
    //     // right
    //     // console.log('inc')
    //   }
    // }
  }
}

module.exports = Toolbar
