const Tooltip = require('tether-tooltip')
Tooltip.autoinit = false

const content = (title, description, keys) => `
<div class="title">${title}</div>
<div class="description">${description}</div>
<div class="key-command">
  ${keys}
</div>
`

// https://www.npmjs.com/package/electron-accelerator-formatter
const acceleratorAsHtml = (accel) => {
  `<kbd class="action-key-anim">${accel}</kbd>`
}

const init = () => {
  const tooltipElements = document.querySelectorAll('[data-tooltip]')
  for (let el of tooltipElements) {
    let title = el.dataset.tooltipTitle
    let description = el.dataset.tooltipDescription
    let keys = el.dataset.tooltipKeys
    let position = el.dataset.tooltipPosition
    console.log(title, description, keys, position)
    return new Tooltip({
      target: el,
      content: content(title, description, keys),
      position
    })
  }
}

module.exports.init = init