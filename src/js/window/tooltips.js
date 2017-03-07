let { acceleratorAsHtml } = require('../utils/index.js')

const Tooltip = require('tether-tooltip')
Tooltip.autoinit = false

const content = (title, description, keys) =>
  `<div class="title">${title}</div>` +
   `<div class="description">${description}</div>` +
   (keys 
     ? `<div class="key-command">${acceleratorAsHtml(keys)}</div>`
     : '')

const setupTooltipForElement = (el) => {
  let title = el.dataset.tooltipTitle
  let description = el.dataset.tooltipDescription || ''
  let keys = el.dataset.tooltipKeys
  let position = el.dataset.tooltipPosition || 'top left'
  return new Tooltip({
    target: el,
    content: content(title, description, keys),
    position
  })  
}

const init = () => {
  const tooltipElements = document.querySelectorAll('[data-tooltip]')
  for (let el of tooltipElements) {
    setupTooltipForElement(el)
  }
}

module.exports = {
  init,
  setupTooltipForElement
}
