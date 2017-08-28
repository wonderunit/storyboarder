const Guides = require('../../../src/js/window/guides.js')

const wrapperEl = document.querySelector('.wrapper')

const canvas = document.createElement('canvas')

wrapperEl.appendChild(canvas)

let guides

const render = () => {
  const wrapperRect = wrapperEl.getBoundingClientRect()
  const { width, height } = wrapperRect
  canvas.style.width = width + 'px'
  canvas.style.height = height + 'px'
  canvas.width = width * 2
  canvas.height = height * 2

  let state = guides ? guides.state : {
    grid: true,
    center: true,
    thirds: true,
    perspective: true
  }

  guides = new Guides(canvas)
  guides.setState(state)
}
window.addEventListener('resize', render)
render()
