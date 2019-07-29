const h = require('../utils/h')

const Icon = ({ src }) => h(
  [
    'img.icon', {
      width: 32,
      height: 32,
      src: `./img/shot-generator/${src}.svg`
    }
  ]
)

module.exports = Icon
