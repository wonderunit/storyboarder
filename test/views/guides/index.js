const Guides = require('../../../src/js/window/guides')

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

  guides = new Guides({
    width: canvas.width,
    height: canvas.height,
    perspectiveGridFn: () => {
      // NOOP for testing only
      return document.createElement('canvas')
    },
    onRender: guidesCanvas => {
      let context = canvas.getContext('2d')
      context.clearRect(0, 0, width, height)

      context.drawImage(guidesCanvas, 0, 0)
    }
  })
  guides.setState(state)
}
window.addEventListener('resize', render)
render()
