let { acceleratorAsHtml } = require('../utils/index.js')

const Tooltip = require('tether-tooltip')
Tooltip.autoinit = false

const content = (title, description, keys) =>
  `<div class="title">${title}</div>` +
   `<div class="description">${description}</div>` +
   (keys 
     ? `<div class="key-command">${acceleratorAsHtml(keys)}</div>`
     : '')

const init = () => {
  const tooltipElements = document.querySelectorAll('[data-tooltip]')
  for (let el of tooltipElements) {
    let title = el.dataset.tooltipTitle
    let description = el.dataset.tooltipDescription
    let keys = el.dataset.tooltipKeys
    let position = el.dataset.tooltipPosition
    new Tooltip({
      target: el,
      content: content(title, description, keys),
      position
    })
  }
}

module.exports.init = init