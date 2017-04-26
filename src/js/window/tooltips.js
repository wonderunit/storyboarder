const { remote } = require('electron')

let { acceleratorAsHtml } = require('../utils/index.js')

const getEnableTooltips = () => remote.getGlobal('sharedObj').prefs['enableTooltips']

const Tooltip = require('tether-tooltip')
Tooltip.autoinit = false

let tooltips = []

const content = (title, description, keys) =>
  `<div class="title">${title}</div>` +
   `<div class="description">${description}</div>` +
   (keys 
     ? `<div class="key-command">${acceleratorAsHtml(keys)}</div>`
     : '')

const housekeeping = () => {
  // remove any tooltips for elements that no longer exist
  let valid = []
  for (let tooltip of tooltips) {
    if (!tooltip.options.target.parentNode) {
      tooltip.close()
      tooltip.remove()
      tooltip.destroy()
    } else {
      valid.push(tooltip)
    }
  }
  tooltips = valid
}

const setupTooltipForElement = (el) => {
  let title = el.dataset.tooltipTitle
  let description = el.dataset.tooltipDescription || ''
  let keys = el.dataset.tooltipKeys
  let position = el.dataset.tooltipPosition || 'top left'
  let tooltip = new Tooltip({
    target: el,
    content: content(title, description, keys),
    position
  })
  tooltips.push(tooltip)
  housekeeping()
  return tooltip
}

const init = () => {
  if (!getEnableTooltips()) return false

  const tooltipElements = document.querySelectorAll('[data-tooltip]')
  for (let el of tooltipElements) {
    setupTooltipForElement(el)
  }
}

module.exports = {
  init,
  setupTooltipForElement
}
