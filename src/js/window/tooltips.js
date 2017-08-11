const { remote } = require('electron')
let { acceleratorAsHtml } = require('../utils/index.js')
const prefsModule = require('electron').remote.require('./prefs.js')
const Tooltip = require('tether-tooltip')
const sfx = require('../wonderunit-sound.js')

let enableTooltips

const getPrefs = () => {
  enableTooltips = prefsModule.getPrefs('tooltips')['enableTooltips']
}

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
  if (!enableTooltips) return false
  let title = el.dataset.tooltipTitle
  let description = el.dataset.tooltipDescription || ''
  let keys = el.dataset.tooltipKeys
  let position = el.dataset.tooltipPosition || 'top left'
  let tooltip = new Tooltip({
    target: el,
    content: content(title, description, keys),
    position,
    constrainToWindow: true,
    remove: true,
    constraints: [
      {
        to: 'window',
        pin: true,
        attachment: 'both'
      }
    ],
    optimizations: {
      gpu: false
    },
    hoverOpenDelay: 1500

  })
  // HACK! force close immediately unless we allow tooltips in preferences
  tooltip.drop.on('open', () => {
    sfx.playEffect('metal')
    if (!enableTooltips || el.dataset.tooltipIgnore) {
      tooltip.close()
    }
  })
  tooltips.push(tooltip)
  housekeeping()
  return tooltip
}

const closeAll = () => tooltips.forEach(t => t.close())

const setIgnore = (el, value) => {
  if (value) {
    el.dataset.tooltipIgnore = true
  } else {
    delete el.dataset.tooltipIgnore
  }
}

const init = () => {
  getPrefs('pref editor')
  if (!enableTooltips) return false

  const tooltipElements = document.querySelectorAll('[data-tooltip]')
  for (let el of tooltipElements) {
    setupTooltipForElement(el)
  }
}

module.exports = {
  init,
  setupTooltipForElement,
  housekeeping,
  getPrefs,
  setIgnore,
  closeAll
}