const remote = require('@electron/remote')
const EventEmitter = require('events').EventEmitter
const Color = require('color-js')

const Detector = require('../vendor/Detector')

const util = require('../utils/index')
const sfx = require('../wonderunit-sound')
const observeStore = require('../shared/helpers/observeStore')

class Toolbar extends EventEmitter {
  constructor (store, el) {
    super()

    this.store = store
    this.el = el

    this.swatchTimer = null
    this.swatchDelay = 2000

    this.onButtonDown = this.onButtonDown.bind(this)
    this.onButtonOver = this.onButtonOver.bind(this)
    this.onSwatchUp = this.onSwatchUp.bind(this)
    this.onSwatchDown = this.onSwatchDown.bind(this)

    this.draggables = []

    this.attachedCallback(this.el)

    // listen for changes to the toolbar state
    observeStore(this.store, state => state.toolbar, this.render.bind(this), true)
  }

  attachedCallback () {
    const immediateButtons = [...this.el.querySelectorAll('.button:not([id^="toolbar-palette-color"])')]
    const swatchButtons = [...this.el.querySelectorAll('.button[id^="toolbar-palette-color"]')]
    const overableControls = [].concat(
      immediateButtons,
      swatchButtons
    )

    for (let buttonEl of immediateButtons) {
      buttonEl.addEventListener('pointerdown', this.onButtonDown)
    }

    for (let buttonEl of swatchButtons) {
      // buttonEl.addEventListener('pointerup', this.onSwatchUp)
      buttonEl.addEventListener('pointerdown', this.onSwatchDown)
    }

    for (let el of overableControls) {
      el.addEventListener('pointerenter', this.onButtonOver)
    }

    this.draggables.push(
      new DraggableText({
        el: this.el.querySelector('.toolbar-brush-modifier-controls_size'),
        getValue: () => {
          let state = this.store.getState()
          return state.toolbar.tools[state.toolbar.activeTool].size
        },
        setValue: (pos, curr) => {
          let payload = curr + (pos * 256)
          if (payload > 1 && payload <= 1.25) {
            payload = 1.25
          } else if (payload > 1.25 && payload < 1.75) {
            payload = 1.5
          } else if (payload >= 1.75 && payload < 2) {
            payload = 1.75
          } else {
            payload = Math.floor(payload)
          }
          this.store.dispatch({ type: 'TOOLBAR_BRUSH_SIZE_SET', payload, meta: { scope: 'local' } })
          // TODO sound, throttled
        },
        formatValueForDisplay: value => {
          if (value > 1 && value < 2) {
            return value
          } else {
            return Math.round(value)
          }
        }
      })
    )

    this.draggables.push(
      new DraggableText({
        el: this.el.querySelector('.toolbar-brush-modifier-controls_stroke-opacity'),
        getValue: () => {
          let state = this.store.getState()
          return state.toolbar.tools[state.toolbar.activeTool].strokeOpacity
        },
        setValue: (pos, curr) => {
          let payload = curr + (pos * 10)
          this.store.dispatch({ type: 'TOOLBAR_BRUSH_STROKE_OPACITY_SET', payload, meta: { scope: 'local' } })
        },
        formatValueForDisplay: value => {
          return Math.round(value * 100) + '%'
        }
      })
    )
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

  onButtonDown (event) {
    let selection = this.getEventTargetSelection(event.target)

    const state = this.store.getState()

    switch (selection) {
      // tools
      case 'light-pencil':
      case 'brush':
      case 'tone':
      case 'pencil':
      case 'pen':
      case 'note-pen':
      case 'eraser':
        if (state.toolbar.activeTool !== selection) {
          this.store.dispatch({ type: 'TOOLBAR_TOOL_CHANGE', payload: selection, meta: { scope: 'local' } })
          sfx.playEffect('tool-' + selection)
        }
        break

      case 'trash':
        this.emit('trash')
        break
      // case 'fill':
      //   this.emit('fill', this.state.brushes[this.state.brush].color)
      //   break

      case 'move':
        // attempt change
        this.store.dispatch({
          type: 'TOOLBAR_MODE_SET',
          payload: this.store.getState().toolbar.mode === 'moving' ? 'drawing' : 'moving',
          meta: { scope: 'local' }
        })
        // play a sound if it worked
        if (this.store.getState().toolbar.mode === 'moving') {
          sfx.playEffect('metal')
        }
        break
      case 'scale':
        // attempt change
        this.store.dispatch({
          type: 'TOOLBAR_MODE_SET',
          payload: this.store.getState().toolbar.mode === 'scaling' ? 'drawing' : 'scaling',
          meta: { scope: 'local' }
        })
        // play a sound if it worked
        if (this.store.getState().toolbar.mode === 'scaling') {
          sfx.playEffect('metal')
        }
        break

      case 'marquee':
        // attempt toggle
        this.store.dispatch({
          type: 'TOOLBAR_MODE_SET',
          payload: this.store.getState().toolbar.mode === 'marquee'
            ? 'drawing'
            : 'marquee',
          meta: { scope: 'local' }
        })
        // play a sound if it worked
        if (this.store.getState().toolbar.mode === 'marquee') {
          sfx.playEffect('metal')
        }
        break

      // undo/redo
      case 'undo':
        this.emit('undo')
        break
      case 'redo':
        this.emit('redo')
        break

      case 'current-color':
        if (state.toolbar.activeTool === 'eraser') return
        this.emit('current-color-picker')
        break

      case 'grid':
        this.store.dispatch({ type: 'TOOLBAR_GUIDE_TOGGLE', payload: 'grid' })
        // this.store.dispatch({ type: 'PLAY_SOUND', payload: 'metal' }) // TODO
        sfx.playEffect('metal')
        break
      case 'center':
        this.store.dispatch({ type: 'TOOLBAR_GUIDE_TOGGLE', payload: 'center' })
        // this.store.dispatch({ type: 'PLAY_SOUND', payload: 'metal' }) // TODO
        sfx.playEffect('metal')
        break
      case 'thirds':
        this.store.dispatch({ type: 'TOOLBAR_GUIDE_TOGGLE', payload: 'thirds' })
        // this.store.dispatch({ type: 'PLAY_SOUND', payload: 'metal' }) // TODO
        sfx.playEffect('metal')
        break
      case 'perspective':
        this.store.dispatch({ type: 'TOOLBAR_GUIDE_TOGGLE', payload: 'perspective' })
        // this.store.dispatch({ type: 'PLAY_SOUND', payload: 'metal' }) // TODO
        sfx.playEffect('metal')
        break

      case 'onion':
        this.store.dispatch({ type: 'TOOLBAR_ONION_TOGGLE' })
        sfx.playEffect('metal')
        break
      case 'captions':
        this.store.dispatch({ type: 'TOOLBAR_CAPTIONS_TOGGLE' })
        sfx.playEffect('metal')
        break
      case 'open-in-editor':
        this.emit('open-in-editor')
        break
      case 'pomodoro-rest':
        sfx.playEffect('metal')
        this.emit('pomodoro-rest')
        break
      case 'pomodoro-running':
      case 'pomodoro-running-status':
        this.emit('pomodoro-running')
        break

      default:
        // console.log('toolbar selection', selection)
        break
    }
  }

  onSwatchDown (event) {
    const state = this.store.getState()

    if (state.toolbar.activeTool == null || state.toolbar.activeTool === 'eraser') return

    clearTimeout(this.swatchTimer)
    this.swatchTimer = setTimeout(this.onSwatchColorPicker.bind(this, event.target), this.swatchDelay)

    document.addEventListener('pointerup', this.onSwatchUp)
  }

  onSwatchColorPicker (target) {
    clearTimeout(this.swatchTimer)
    this.swatchTimer = null
    document.removeEventListener('pointerup', this.onSwatchUp)

    let selection = this.getEventTargetSelection(target)

    switch (selection) {
      case 'palette-colorA':
      case 'palette-colorB':
      case 'palette-colorC':
        let index = ['palette-colorA', 'palette-colorB', 'palette-colorC'].indexOf(selection)
        this.emit('palette-color-picker', { target, index })
        break
    }
  }

  onSwatchUp (event) {
    if (this.swatchTimer) {
      // timer is still running so we never showed the Color Picker
      clearTimeout(this.swatchTimer)
      this.swatchTimer = null

      if (this.store.getState().toolbar.activeTool === 'eraser') return

      let selection = this.getEventTargetSelection(event.target)
      let index = ['palette-colorA', 'palette-colorB', 'palette-colorC'].indexOf(selection)

      if (index > -1) {
        this.store.dispatch((dispatch, getState) => {
          const state = getState()
          dispatch({
            type: 'TOOLBAR_TOOL_SET',
            payload: {
              color: state.toolbar.tools[state.toolbar.activeTool].palette[index]
            }
          })
        })
      }
    }
  }

  getState () {
    return this.state
  }

  render () {
    const state = this.store.getState()

    for (let brushEl of this.el.querySelectorAll('.button[data-group=brushes]')) {
      brushEl.classList.toggle('active', brushEl.id === `toolbar-${state.toolbar.activeTool}`)
    }

    let btnMove = this.el.querySelector('#toolbar-move')
    let btnScale = this.el.querySelector('#toolbar-scale')
    let btnMarquee = this.el.querySelector('#toolbar-marquee')

    switch (state.toolbar.mode) {
      case 'moving':
        btnMove.classList.add('active')
        btnScale.classList.remove('active')
        btnMarquee.classList.remove('active')
        break
      case 'scaling':
        btnScale.classList.add('active')
        btnMove.classList.remove('active')
        btnMarquee.classList.remove('active')
        break
      case 'marquee':
        btnScale.classList.remove('active')
        btnMove.classList.remove('active')
        btnMarquee.classList.add('active')
        break
      default:
        btnScale.classList.remove('active')
        btnMove.classList.remove('active')
        btnMarquee.classList.remove('active')
        break
    }

    let btnCaptions = this.el.querySelector('#toolbar-captions')
    if (state.toolbar.captions) {
      btnCaptions.classList.add('active')
    } else {
      btnCaptions.classList.remove('active')
    }

    let gridEl = this.el.querySelector('#toolbar-grid')
    let centerEl = this.el.querySelector('#toolbar-center')
    let thirdsEl = this.el.querySelector('#toolbar-thirds')
    let perspectiveEl = this.el.querySelector('#toolbar-perspective')
    gridEl.classList.toggle('active', state.toolbar.grid)
    centerEl.classList.toggle('active', state.toolbar.center)
    thirdsEl.classList.toggle('active', state.toolbar.thirds)
    perspectiveEl.classList.toggle('active', state.toolbar.perspective)

    let onionEl = this.el.querySelector('#toolbar-onion')
    onionEl.classList.toggle('active', state.toolbar.onion)

    if (state.toolbar.activeTool && state.toolbar.activeTool !== 'eraser') {
      this.el.querySelector('#toolbar-current-color .icon').style.backgroundColor = Color(
        util.numberToColor(
          state.toolbar.tools[state.toolbar.activeTool].color
        )
      )

      let palette = state.toolbar.tools[state.toolbar.activeTool].palette
      const paletteIcons = ['A', 'B', 'C'].map(letter => this.el.querySelector(`#toolbar-palette-color${letter} .icon`))
      paletteIcons[0].style.backgroundColor = Color(util.numberToColor(palette[0])).toCSS()
      paletteIcons[1].style.backgroundColor = Color(util.numberToColor(palette[1])).toCSS()
      paletteIcons[2].style.backgroundColor = Color(util.numberToColor(palette[2])).toCSS()
    }

    if (state.toolbar.activeTool) {
      for (let draggable of this.draggables) {
        draggable.render()
      }
    }

    // prevent perspective guide when WebGL is not available
    if (!Detector.webgl) {
      perspectiveEl.style.display = 'none'
    }
  }

  onButtonOver (event) {
    sfx.rollover()
  }

  startPomodoroTimer (data) {
    let elRest = document.querySelector('#toolbar-pomodoro-rest')
    elRest.style.display = 'none'
    let elRunning = document.querySelector('#toolbar-pomodoro-running')
    elRunning.style.display = 'flex'
    let elRunningStatus = document.querySelector('#toolbar-pomodoro-running-status')
    elRunningStatus.innerHTML = data.remainingFriendly
  }

  updatePomodoroTimer (data = { remaining: 0 }) {
    let elRest = document.querySelector('#toolbar-pomodoro-rest')
    let elRunning = document.querySelector('#toolbar-pomodoro-running')
    let elRunningStatus = document.querySelector('#toolbar-pomodoro-running-status')
    switch (data.state) {
      case 'running':
        elRunningStatus.innerHTML = data.remainingFriendly
        break
      case 'completed':
        elRest.style.display = 'flex'
        elRunning.style.display = 'none'
        break
      case 'rest':
        elRest.style.display = 'flex'
        elRunning.style.display = 'none'
    }
  }
}

class DraggableText {
    constructor ({ el, getValue, setValue, formatValueForDisplay }) {
      this.onPointerMove = this.onPointerMove.bind(this)

      this.el = el

      this.getValue = getValue.bind(this)
      this.setValue = setValue.bind(this)
      this.formatValueForDisplay = formatValueForDisplay.bind(this)

      this.anchorX = null
      this.anchorValue = null

      this.el.addEventListener('pointerdown', event => {
        this.anchorX = event.clientX
        this.anchorValue = getValue()
        document.addEventListener('pointermove', this.onPointerMove)
      })

      document.addEventListener('pointerup', event => {
        document.removeEventListener('pointermove', this.onPointerMove)
      })

      // document.addEventListener('pointerleave', event => {
      //   document.removeEventListener('pointermove', this.onPointerMove)
      // })
      // 
      // document.addEventListener('blur', event => {
      //   document.removeEventListener('pointermove', this.onPointerMove)
      // })
    }
    onPointerMove (event) {
      this.setValue((event.clientX - this.anchorX) / document.body.offsetWidth, this.anchorValue)
    }
    render () {
      this.el.innerHTML = this.formatValueForDisplay(this.getValue())
    }
}

module.exports = Toolbar
