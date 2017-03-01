const EventEmitter = require('events').EventEmitter
const Tether = require('tether')

class ContextMenu extends EventEmitter {
  constructor () {
    super()
    this.timer = null
    this.delay = 1500

    this.target = null

    this.el = null
    this.innerEl = null
    this.create()
  }

  template () {
    return `<div class="context-menu-container">
      <div id="context-menu" class="bottom-nub">
        <div class="item" data-action="add">Add New <div class="key-command"><kbd>n</kbd></div></div>
        <div class="item" data-action="duplicate">Duplicate <div class="key-command"><kbd>d</kbd></div></div>
        <div class="item" data-action="copy">Copy <div class="key-command"><kbd class="modifier">&#x2318;</kbd>+<kbd>c</kbd></div></div>
        <div class="item" data-action="paste">Paste <div class="key-command"><kbd class="modifier">&#x2318;</kbd>+<kbd>v</kbd></div></div>
        <div class="item" data-action="import">Import <div class="key-command"><kbd class="modifier">&#x2318;</kbd>+<kbd>i</kbd></div></div>
        <div class="hr"></div>
        <div class="item" data-action="delete">Delete <div class="key-command"><kbd class="modifier">delete</kbd></div></div>
        <div class="hr"></div>
        <div class="item" data-action="reorder-left">Reorder Left <div class="key-command"><kbd class="modifier">option</kbd>+<kbd>◄</kbd></div></div>
        <div class="item" data-action="reorder-right">Reorder Right <div class="key-command"><kbd class="modifier">option</kbd>+<kbd>►</kbd></div></div>
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
    
    this.innerEl = this.el.querySelector('#context-menu')
  }
  
  onPointerDown (event) {
    this.emit(event.target.dataset.action)
    this.remove()
  }
  
  onPointerLeave (event) {
    this.emit('pointerleave')
  }

  onTimeout () {
    this.fadeIn()
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
      clearTimeout(this.timer)

      if (this.tethered) this.remove()

      this.target = target
      this.tethered = new Tether({
        element: this.el,
        target: this.target,
        attachment: 'bottom center',
        targetAttachment: 'top center'
      })

      this.timer = setTimeout(this.onTimeout.bind(this), this.delay)
    }
  }
  
  remove () {
    this.target = null
    clearTimeout(this.timer)
    this.fadeOut()
    this.tethered && this.tethered.destroy()
  }
}

module.exports = ContextMenu