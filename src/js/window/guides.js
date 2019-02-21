const rgba = (r, g, b, a) => `rgba(${r}, ${g}, ${b}, ${parseFloat(a)})`

const THREE = require('THREE')

class Guides {
  constructor (opt) {
    this.width = opt.width
    this.height = opt.height
    this.onRender = opt.onRender

    this.state = {
      grid: false,
      center: false,
      thirds: false,
      perspective: false,
      eyeline: false
    }

    // for crisp lines
    // see: http://www.mobtowers.com/html5-canvas-crisp-lines-every-time/
    this.translateShift = 0.5

    this.offscreenCanvas = null
    this.offscreenContext = null

    this.perspectiveParams = {}

    this.offscreenCanvas = document.createElement('canvas')
    this.offscreenContext = this.offscreenCanvas.getContext('2d')
    this.offscreenCanvas.width = this.width
    this.offscreenCanvas.height = this.height

    this.canvas = document.createElement('canvas')
    this.context = this.canvas.getContext('2d')
    this.canvas.width = this.width
    this.canvas.height = this.height

    this.render()
  }

  setState (newState) {
    let hasChanged = newState.grid !== this.state.grid ||
                     newState.center !== this.state.center ||
                     newState.thirds !== this.state.thirds ||
                     newState.perspective !== this.state.perspective ||
                     newState.eyeline !== this.state.eyeline
    if (hasChanged) {
      this.state = Object.assign(this.state, newState)
      this.render()
    }
  }

  render () {
    const lineColorMuted = [0, 0, 0, 0.1]
    const lineColorStrong = [0, 0, 0, 0.4]
    const lineColorWhite = [255, 255, 255, 0.1]

    this.context.clearRect(0, 0, this.width, this.height)

    //
    //
    // light
    //
    this.offscreenContext.clearRect(0, 0, this.width, this.height)
    if (this.state.grid) this.drawGrid(this.offscreenContext, this.width, this.height, rgba(...lineColorWhite.slice(0, 3), 1.0), 3)
    if (this.state.center) this.drawCenter(this.offscreenContext, this.width, this.height, rgba(...lineColorWhite.slice(0, 3), 1.0), 3)
    if (this.state.thirds) this.drawThirds(this.offscreenContext, this.width, this.height, rgba(...lineColorWhite.slice(0, 3), 1.0), 3)
    if (this.state.eyeline) this.drawEyeline(this.offscreenContext, this.width, this.height, rgba(...lineColorWhite.slice(0, 3), 1.0), 3)

    this.context.globalAlpha = lineColorWhite.slice(-1)[0]
    this.context.drawImage(this.offscreenCanvas, 0, 0, this.width, this.height)
    this.context.globalAlpha = 1.0

    //
    //
    // dark
    //
    // grid
    this.offscreenContext.clearRect(0, 0, this.width, this.height)
    if (this.state.grid) this.drawGrid(this.offscreenContext, this.width, this.height, rgba(...lineColorMuted.slice(0, 3), 1.0), 1)
    this.context.globalAlpha = lineColorMuted.slice(-1)[0]
    this.context.drawImage(this.offscreenCanvas, 0, 0, this.width, this.height)

    // center
    this.offscreenContext.clearRect(0, 0, this.width, this.height)
    if (this.state.center) this.drawCenter(this.offscreenContext, this.width, this.height, rgba(...lineColorStrong.slice(0, 3), 1.0), 1)
    this.context.globalAlpha = lineColorStrong.slice(-1)[0]
    this.context.drawImage(this.offscreenCanvas, 0, 0, this.width, this.height)

    // muted
    this.offscreenContext.clearRect(0, 0, this.width, this.height)
    if (this.state.thirds) this.drawThirds(this.offscreenContext, this.width, this.height, rgba(...lineColorStrong.slice(0, 3), 1.0), 1)
    this.context.globalAlpha = lineColorStrong.slice(-1)[0]
    this.context.drawImage(this.offscreenCanvas, 0, 0, this.width, this.height)

    // eyeline
    this.offscreenContext.clearRect(0, 0, this.width, this.height)
    if (this.state.eyeline) this.drawEyeline(this.offscreenContext, this.width, this.height, rgba(...lineColorStrong.slice(0, 3), 1.0), 1)
    this.context.globalAlpha = lineColorStrong.slice(-1)[0]
    this.context.drawImage(this.offscreenCanvas, 0, 0, this.width, this.height)

    // perspective
    if (this.state.perspective) {
      this.offscreenContext.clearRect(0, 0, this.width, this.height)
      this.drawPerspective(this.offscreenContext, this.width, this.height, this.perspectiveParams)

      this.context.globalAlpha = lineColorStrong.slice(-1)[0]
      this.context.drawImage(this.offscreenCanvas, 0, 0, this.width, this.height)
      this.context.globalAlpha = 1.0
    }

    this.context.globalAlpha = 1.0

    this.onRender && this.onRender(this.context.canvas)
  }

  drawGrid (context, width, height, color, lineWidth) {
    context.translate(this.translateShift, this.translateShift)
    let squareSize = 50
    // let centerX = width / 2
    let stepsX = width / squareSize
    let stepsY = height / squareSize
    let offsetX = (width / 2) % squareSize
    let offsetY = (height / 2) % squareSize
    context.lineWidth = lineWidth
    context.strokeStyle = color
    for (let n = 0; n < stepsX; n++) {
      let x = (n * squareSize) + offsetX
      context.beginPath()
      context.moveTo(...[x, 0].map(Math.floor))
      context.lineTo(...[x, height].map(Math.floor))
      context.stroke()
    }
    for (let n = 0; n < stepsY; n++) {
      context.beginPath()
      let y = (n * squareSize) + offsetY
      context.moveTo(...[0, y].map(Math.floor))
      context.lineTo(...[width, y].map(Math.floor))
      context.stroke()
    }
    context.translate(-this.translateShift, -this.translateShift)
  }

  drawCenter (context, width, height, color, lineWidth) {
    let midpointX = Math.floor(width / 2)
    let midpointY = Math.floor(height / 2)
    context.translate(this.translateShift, this.translateShift)
    context.lineWidth = lineWidth
    context.strokeStyle = color

    // horizontal
    context.beginPath()
    context.moveTo(0, midpointY)
    context.lineTo(width, midpointY)
    context.stroke()

    // vertical
    context.beginPath()
    context.moveTo(midpointX, 0)
    context.lineTo(midpointX, height)
    context.stroke()
    context.translate(-this.translateShift, -this.translateShift)
  }

  drawThirds (context, width, height, color, lineWidth) {
    context.translate(this.translateShift, this.translateShift)

    context.lineWidth = lineWidth
    context.strokeStyle = color

    let w0 = width / 3
    let h0 = height / 3

    for (let n = 1; n < 3; n++) {
      let x = n * w0
      let y = n * h0

      context.beginPath()
      context.moveTo(...[x, 0].map(Math.floor))
      context.lineTo(...[x, height].map(Math.floor))
      context.stroke()

      context.beginPath()
      context.moveTo(...[0, y].map(Math.floor))
      context.lineTo(...[width, y].map(Math.floor))
      context.stroke()
    }
    context.translate(-this.translateShift, -this.translateShift)
  }

  drawPerspective (
    context,
    width,
    height,
    { camera, aspectRatio }
  ) {
    // default perspective camera for boards without shot generator data
    if (!camera) {
      camera = {
        fov: 50,
        x: 0.1,
        y: 1.7,
        z: 1,
        rotation: -0.232,
        tilt: 0,
        roll: 0
      }
    }

    // via shot-template-system/index.js#requestGrid
    let cameraParams = camera
    let dimensions = [width, height]

    let ctx = context
    context.save()

    if (camera) {
      let distance = (point1, point2) => {
        let a = point2.x-point1.x
        let b = point2.y-point1.y
        return Math.sqrt(a*a+b*b)
      }

      let toScreenPosition = (obj, camera) => {
        let vector = new THREE.Vector3()
        let widthHalf = 0.5 * dimensions[0]
        let heightHalf = 0.5 * dimensions[1]

        obj.updateMatrixWorld()
        vector.setFromMatrixPosition(obj.matrixWorld)

        vector.project(camera)

        vector.x = ( vector.x * widthHalf ) + widthHalf
        vector.y = - ( vector.y * heightHalf ) + heightHalf

        return { x: vector.x, y: vector.y }
      }

      let gridCamera = new THREE.PerspectiveCamera(
        cameraParams.fov,
        aspectRatio,
        .01,
        1000
      )
      gridCamera.position.x = cameraParams.x
      gridCamera.position.y = cameraParams.y
      gridCamera.position.z = cameraParams.z

      gridCamera.rotation.x = 0
      gridCamera.rotation.z = 0
      gridCamera.rotation.y = cameraParams.rotation
      gridCamera.rotateX(cameraParams.tilt)
      gridCamera.rotateZ(cameraParams.roll)

      gridCamera.updateProjectionMatrix()
      gridCamera.updateMatrixWorld( true )

      let prop = ['x','y','z']
      let color = ['rgb(0,0,100)', 'rgb(100,100,0)','rgb(0,100,0)']
      let perspectivePoint = []
      let extreme = 150

      for (var i = 0; i < 3; i++) {
        let divObjA = new THREE.Object3D()
        divObjA.position[prop[i]] = extreme
        let pointA = toScreenPosition(divObjA,gridCamera)
        console.log(pointA)
        let divObjB = new THREE.Object3D()
        divObjB.position[prop[i]] = -(extreme)
        let pointB = toScreenPosition(divObjB,gridCamera)
        console.log(pointB)
        if (distance(pointA, {x: dimensions[0]/2, y: dimensions[1]/2}) < distance(pointB, {x: dimensions[0]/2, y: dimensions[1]/2})) {
          perspectivePoint[i] = pointA
        } else {
          perspectivePoint[i] = pointB
        }
      }

      for (var i = 0; i < 3; i++) {
        let dist = distance(perspectivePoint[i], {x: dimensions[0]/2, y: dimensions[1]/2})
        let amt = Math.max(dist/1.5,360)
        for (var j = 0; j < (amt-1); j++) {
          ctx.beginPath()
          ctx.moveTo(perspectivePoint[i].x, perspectivePoint[i].y)
          let angle = (j*(360/(amt))) * Math.PI / 180
          let x = (perspectivePoint[i].x+100000) * Math.cos(angle) - (perspectivePoint[i].y) * Math.sin(angle)
          let y = (perspectivePoint[i].y) * Math.cos(angle) - (perspectivePoint[i].x+100000) * Math.sin(angle)
          if (j % 5 == 0) {
            ctx.lineWidth = 0.6
          } else {
            ctx.lineWidth = .2
          }
          ctx.strokeStyle = color[i]
          ctx.lineTo(x,y)
          ctx.stroke()
        }
      }

      // TODO draw horizon line
      // let horizonAngle = Math.atan2(perspectivePoint[2].y - perspectivePoint[0].y, perspectivePoint[2].x - perspectivePoint[0].x)
      // let x = Math.cos(horizonAngle) * (10000) - Math.sin(horizonAngle) * (0) + perspectivePoint[2].x
      // let y = Math.sin(horizonAngle) * (10000) - Math.cos(horizonAngle) * (0) + perspectivePoint[2].y
      // ctx.beginPath()
      // ctx.setLineDash([10, 4])
      // ctx.moveTo(x, y)
      // let x2 = Math.cos(horizonAngle) * (-20000) - Math.sin(horizonAngle) * (0) + x 
      // let y2 = Math.sin(horizonAngle) * (-20000) - Math.cos(horizonAngle) * (0) + y
      // ctx.lineWidth = 1
      // ctx.strokeStyle = "black"
      // ctx.lineTo(x2,y2)
      // ctx.stroke()
    }

    context.restore()
  }

  setPerspectiveParams (opt = {}) {
    this.perspectiveParams = {
      ...opt
    }
    this.render()
  }

  drawEyeline (context, width, height, color, lineWidth) {
    context.translate(this.translateShift, this.translateShift)

    let between = (a, b) => a + (b - a) / 2

    let DIM = 0.4

    let ys = [
      // mark at 1/4
      [Math.floor(height * 1/4), 1],
      // dim mark between 1/4 and 1/3
      [Math.floor(height * between(1/4, 1/3)), DIM],
      // mark at 1/3
      [Math.floor(height * 1/3), 1],

      // dim mark between 1/3 and 1/2
      [Math.floor(height * between(1/3, 1/2)), DIM],
      // mark at 1/2
      [Math.floor(height * 1/2), 1]
    ]

    for (let [y, alpha] of ys) {
      context.lineWidth = lineWidth
      context.strokeStyle = color

      context.globalAlpha = alpha
      context.beginPath()
      context.moveTo(0, y)
      context.lineTo(width, y)
      context.stroke()
      context.globalAlpha = 1.0
    }

    context.translate(-this.translateShift, -this.translateShift)
  }
}

module.exports = Guides
