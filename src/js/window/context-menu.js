const Tether = require('tether')

class ContextMenu {
  template () {
    return `<div class="context-menu-container">
      <div id="context-menu" class="bottom-nub appear-anim">
        <div class="item">Add New <div class="key-command"><kbd>n</kbd></div></div>
        <div class="item">Duplicate <div class="key-command"><kbd>d</kbd></div></div>
        <div class="item">Copy <div class="key-command"><kbd class="modifier">&#x2318;</kbd>+<kbd>c</kbd></div></div>
        <div class="item">Paste <div class="key-command"><kbd class="modifier">&#x2318;</kbd>+<kbd>v</kbd></div></div>
        <div class="item">Import <div class="key-command"><kbd class="modifier">&#x2318;</kbd>+<kbd>i</kbd></div></div>
        <div class="hr"></div>
        <div class="item">Delete <div class="key-command"><kbd class="modifier">delete</kbd></div></div>
        <div class="hr"></div>
        <div class="item">Reorder Left <div class="key-command"><kbd class="modifier">option</kbd>+<kbd>◄</kbd></div></div>
        <div class="item">Reorder Right <div class="key-command"><kbd class="modifier">option</kbd>+<kbd>►</kbd></div></div>
      </div>
    </div>`
  }

  create () {
    let t = document.createElement('template')
    t.innerHTML = this.template()
    this.el = t.content.firstChild
    document.body.appendChild(this.el)
  }

  attachTo (target) {
    if (!this.el) this.create()
    if (this.tethered) this.remove()

    this.tethered = new Tether({
      element: this.el,
      target: target,
      attachment: 'bottom center',
      targetAttachment: 'top center',
      offset: '15px 0'
    })
    
    // re-play animation
    this.el.classList.add('appear-anim')
  }
  
  remove () {
    this.el && this.el.classList.remove('appear-anim')
    this.tethered.destroy()
  }
}

module.exports = ContextMenu