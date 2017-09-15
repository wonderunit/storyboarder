const EventEmitter = require('events').EventEmitter
const Tether = require('tether')
let { acceleratorAsHtml } = require('../utils/accelerator')

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
        <div class="item" data-action="add">Add New <div class="key-command">${acceleratorAsHtml('n', { animated: false }) }</div></div>
        <div class="item" data-action="duplicate">Duplicate <div class="key-command">${acceleratorAsHtml('d', { animated: false })}</div></div>
        <div class="item" data-action="copy">Copy <div class="key-command">${acceleratorAsHtml('CmdOrCtrl+C', { animated: false })}</div></div>
        <div class="item" data-action="paste">Paste <div class="key-command">${acceleratorAsHtml('CmdOrCtrl+V', { animated: false })}</div></div>
        <div class="item" data-action="import">Import <div class="key-command">${acceleratorAsHtml('CmdOrCtrl+I', { animated: false })}</div></div>
        <div class="hr"></div>
        <div class="item" data-action="delete">Delete <div class="key-command">${acceleratorAsHtml('CmdOrCtrl+Backspace', { animated: false })}</div></div>
        <div class="hr"></div>
        <div class="item" data-action="reorder-left">Reorder Left <div class="key-command">${acceleratorAsHtml('Alt+Left', { animated: false })}</div></div>
        <div class="item" data-action="reorder-right">Reorder Right <div class="key-command">${acceleratorAsHtml('Alt+Right', { animated: false })}</div></div>
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
    this.el.addEventListener('pointerenter', this.onPointerEnter.bind(this))
    
    this.innerEl = this.el.querySelector('#context-menu')
  }
  
  onPointerDown (event) {
    this.emit(event.target.dataset.action)
    this.remove()
  }
  
  onPointerLeave (event) {
    this.pointerTimerID = setTimeout(()=>{
      this.remove()
      this.pointerTimerID = null
    }, 350)
  }
  
  onPointerEnter (event) {
    if(this.pointerTimerID) {
      clearTimeout(this.pointerTimerID)
      this.pointerTimerID = null
    }
  }

  onTimeout () {
    this.fadeIn()
  }
  
  fadeIn () {
    this.emit('shown')
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

      let targetRect = target.getBoundingClientRect()

      let targetMiddle = ((targetRect.right - targetRect.left) / 2) + targetRect.left
      let attachment = 'bottom center'
      let targetAttachment = 'top center'
      if (targetMiddle - 150 < 0) {
        attachment = 'bottom left'
        targetAttachment = 'top left'
      } else if (targetMiddle + 150 > window.innerWidth) {
        attachment = 'bottom right'
        targetAttachment = 'top right'
      }

      this.target = target
      this.tethered = new Tether({
        element: this.el,
        target: this.target,
        attachment,
        targetAttachment
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