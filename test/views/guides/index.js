const Guides = require('../../src/js/window/guides.js')

const guidesEl = document.getElementById('guides')
const containerEl = document.getElementById('canvas-container')

const guides = new Guides()
guides.create(guidesEl)
guides.attachTo(containerEl)

const update = () => {
  const bounds = containerEl.parentNode.getBoundingClientRect()
  containerEl.style.width = bounds.right + 'px'
  containerEl.style.height = bounds.bottom + 'px'
  guides.setState({
    width: bounds.right,
    height: bounds.bottom
  })
}
window.onresize = update
update()

guides.setState({
  grid: true,
  center: true,
  thirds: true,
  perspective: true,
})
