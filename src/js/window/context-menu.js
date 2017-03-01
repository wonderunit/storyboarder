const EventEmitter = require('events').EventEmitter
const Tether = require('tether')

class ContextMenu extends EventEmitter {
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
  }
  
  onPointerDown (event) {
    this.emit(event.target.dataset.action)
  }

  attachTo (target) {
    if (this.tethered) this.remove()
    if (!this.el) this.create()

    this.tethered = new Tether({
      element: this.el,
      target: target,
      attachment: 'bottom center',
      targetAttachment: 'top center',
      offset: '15px 0'
    })

    // re-play animation
    this.el.querySelector('#context-menu').classList.add('appear-anim')
  }
  
  remove () {
    this.el && this.el.querySelector('#context-menu').classList.remove('appear-anim')
    this.tethered.destroy()
  }
}

module.exports = ContextMenu