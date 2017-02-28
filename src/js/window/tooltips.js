const Tooltip = require('tether-tooltip')

const content = (title, description, keyCommand) => `
<div class="title">${title}</div>
<div class="description">${description}</div>
<div class="key-command">
  ${keyCommand}
</div>
`

// https://www.npmjs.com/package/electron-accelerator-formatter
const acceleratorAsHtml = (accel) => {
  `<kbd class="action-key-anim">${accel}</kbd>`
}

const tooltips = [
  [
    '#toolbar-add',
    'New Board',
    'Description',
    'n',
    'bottom left'
  ],
  [
    '#toolbar-add',
    'New Board',
    'Description',
    'n',
    'bottom left'
  ]
]

const init = () => {
  for (let tooltip of tooltips) {
    return new Tooltip({
      target: document.querySelector(`#toolbar ${tooltip[0]}`),
      content: content(...tooltip.slice(1, 4)),
      position: tooltip[4]
    })
  }
}

module.exports.init = init