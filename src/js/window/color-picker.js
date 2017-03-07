const EventEmitter = require('events').EventEmitter
const Tether = require('tether')
const Color = require('color-js')

class ColorPicker extends EventEmitter {
  constructor () {
    super()
    this.state = { color: null }

    this.target = null

    this.primaryColors = [
      ['Red', '#F44336'],
      ['Pink', '#E91E63'],
      ['Purple', '#9C27B0'],
      ['Deep Purple', '#673AB7'],
      ['Indigo', '#3F51B5'],
      ['Blue', '#2196F3'],
      ['Cornflower Blue', '#03A9F4'],
      ['Cyan', '#00BCD4'],
      ['Teal', '#009688'],
      ['Deep Green', '#4CAF50'],
      ['Green', '#8BC34A'],
      ['Lime', '#CDDC39'],
      ['Yellow', '#FFEB3B'],
      ['Amber', '#FFC107'],
      ['Orange', '#FF9800'],
      ['Deep Orange', '#FF5722'],
      ['Brown', '#795548'],
      ['Blue Grey', '#607D8B'],
      ['Grey', '#9E9E9E'],
    ]


    this.el = null
    this.innerEl = null
    this.create()
  }

  setState (newState) {
    this.state = Object.assign(this.state, newState)
    this.render()
  }

  generateColors () {
 
    let colorRows = []
    
    let colorRow 

    colorRow = []
    for (var i = 0; i < this.primaryColors.length; i++) {
      colorRow.push(['Faint ' + this.primaryColors[i][0],Color(this.primaryColors[i][1]).blend(Color("#fff"),.50).toCSS()])
    }
    colorRows.push(colorRow)

    colorRow = []
    for (var i = 0; i < this.primaryColors.length; i++) {
      colorRow.push(['Light ' + this.primaryColors[i][0],Color(this.primaryColors[i][1]).blend(Color("#fff"),.20).toCSS()])
    }
    colorRows.push(colorRow)

    colorRow = []
    for (var i = 0; i < this.primaryColors.length; i++) {
      colorRow.push([this.primaryColors[i][0],this.primaryColors[i][1]])
    }
    colorRows.push(colorRow)

    colorRow = []
    for (var i = 0; i < this.primaryColors.length; i++) {
      colorRow.push(['Shaded ' + this.primaryColors[i][0],Color(this.primaryColors[i][1]).shiftHue(-5).blend(Color("#000"),.20).toCSS()])
    }
    colorRows.push(colorRow)

    colorRow = []
    for (var i = 0; i < this.primaryColors.length; i++) {
      colorRow.push(['Dark ' + this.primaryColors[i][0],Color(this.primaryColors[i][1]).shiftHue(-10).blend(Color("#000"),.40).toCSS()])
    }
    colorRows.push(colorRow)

    colorRow = []
    for (var i = 0; i < this.primaryColors.length; i++) {
      colorRow.push(['Shadow ' + this.primaryColors[i][0],Color(this.primaryColors[i][1]).shiftHue(-20).blend(Color("#000"),.65).toCSS()])
    }
    colorRows.push(colorRow)

    colorRow = []
    for (var i = 0; i < this.primaryColors.length - 3; i++) {
      colorRow.push(['Pitch ' + this.primaryColors[i][0],Color(this.primaryColors[i][1]).shiftHue(-20).blend(Color("#000"),.80).toCSS()])
    }
    colorRow.push(['Pitch Ass Black',Color("#000").toCSS()])

    colorRows.push(colorRow)

    return colorRows


  }



  // TODO use a class instead of id for styling, refactor context menu
  template () {
    this.colorRows = this.generateColors()

    let html = []

    for (var i = 0; i < this.colorRows.length; i++) {
      html.push(`<div class="color-row">`)
      for (var i2 = 0; i2 < this.colorRows[i].length; i2++) {
        let classArr = ["color-swatch"]
        if (i == (this.colorRows.length-1) && i2 == (this.colorRows[i].length-1) ) {
          classArr.push("last-color")
        }
        html.push(`<div class="${classArr.join(' ')}" data-color-name="${this.colorRows[i][i2][0]}" data-color="${this.colorRows[i][i2][1]}" style="background-color: ${this.colorRows[i][i2][1]};"></div>`)
      }
      html.push(`</div>`)
    }

    return `<div class="color-picker-container popup-container">
      <div id="context-menu" class="color-picker top-nub">
        
        ${html.join('')}
        <div class="color-name">Pick a color</div>
      </div>
    </div>`
  }

  create () {
    let t = document.createElement('template')
    t.innerHTML = this.template()

    this.el = t.content.firstChild
    document.getElementById('storyboarder-main').appendChild(this.el)

    this.el.addEventListener('pointerdown', this.onPointerDown.bind(this))
    this.el.addEventListener('pointerleave', this.onPointerLeave.bind(this))
    
    this.innerEl = this.el.querySelector('.color-picker')

    var swatches = document.querySelectorAll(".color-swatch")

    swatches.forEach((e)=>{
      e.addEventListener('pointerdown', (e)=>{
        console.log('click!', e.target.dataset)
        if (document.querySelector(".color-swatch.active")){
          document.querySelector(".color-swatch.active").classList.remove("active")
        }
        e.target.className += " active"
        document.querySelector(".color-name").innerHTML = `${e.target.dataset.colorName} <span class="color-css">${e.target.dataset.color}</span>`
        this.emit(e.target.dataset.color)
      })
    })


  }
  
  onPointerDown (event) {
    console.log('onPointerDown')
  }
  
  onPointerLeave (event) {
    console.log('onPointerLeave')
  }
  
  fadeIn () {
    this.innerEl.classList.add('appear-anim')
  }

  fadeOut () {
    this.innerEl.classList.remove('appear-anim')
  }
  
  hasChild (child) {
    return this.el.contains(child)
  }

  attachTo (target) {
    if (this.target !== target) {
      if (this.tethered) this.remove()

      this.target = target
      this.tethered = new Tether({
        element: this.el,
        target: this.target,
        attachment: 'top center',
        targetAttachment: 'bottom center'
      })
    }
    this.fadeIn()
  }
  
  remove () {
    this.target = null
    this.fadeOut()
    this.tethered && this.tethered.destroy()
  }

  render () {
    console.log('ColorPicker#render', this.state)
  }
}

module.exports = ColorPicker