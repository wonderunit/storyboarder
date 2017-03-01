var os = require('os')

const Tooltip = require('tether-tooltip')
Tooltip.autoinit = false

const IS_MAC = os.platform() === 'darwin'
const CMD_OR_CTRL = IS_MAC ? '\u2318' : '\u2303'
const MODIFIER_MAP = {
  'Command': '\u2318',
  'Cmd': '\u2318',
  'CommandOrControl': CMD_OR_CTRL,
  'CmdOrCtrl': CMD_OR_CTRL,
  'Super': '\u2318',
  'Control': '\u2303',
  'Ctrl': '\u2303',
  'Shift': '\u21e7',
  'Alt': '\u2325',
  'Plus': '='
}

// see https://www.npmjs.com/package/electron-accelerator-formatter
const acceleratorAsHtml = (accelerator) =>
  accelerator
    .split('+')
    .map(function(k) {
      let m = MODIFIER_MAP[k]
      if (m) {
        return `<kbd class="modifier modifier-key-anim">${m}</kbd>`
      } else {
        return `<kbd class="action-key-anim">${k}</kbd>`
      }
    })
    .join('+')

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