const THREE = require('three')

class CameraControls {

  constructor ( object, domElement ) {
    this.object = object
    this.domElement = domElement
    this.enabled = true

    this.movementSpeed = .001
    this.maxSpeed = 0.05

    this.controller = {
      moveForward : false,
      moveLeft : false,
      moveBackward : false,
      moveRight : false,
      moveUp : false,
      moveDown : false
    }
    this.mouse = {
      moveForward : false,
      moveLeft : false,
      moveBackward : false,
      moveRight : false,
      moveUp : false,
      moveDown : false
    }

    this.onPointerMove = this.onPointerMove.bind(this)
    this.onPointerDown = this.onPointerDown.bind(this)
    this.onPointerUp = this.onPointerUp.bind(this)
    this.onKeyDown = this.onKeyDown.bind(this)
    this.onKeyUp = this.onKeyUp.bind(this)

    window.addEventListener( 'pointermove', this.onPointerMove, false )
    this.domElement.addEventListener( 'pointerdown', this.onPointerDown, false )
    window.addEventListener( 'pointerup', this.onPointerUp, false )
    window.addEventListener( 'keydown', this.onKeyDown, false )
    window.addEventListener( 'keyup', this.onKeyUp, false )
  }

  dispose () {
    window.removeEventListener( 'pointermove', this.onPointerMove )
    this.domElement.removeEventListener( 'pointerdown', this.onPointerDown )
    window.removeEventListener( 'pointerup', this.onPointerUp )
    window.removeEventListener( 'keydown', this.onKeyDown )
    window.removeEventListener( 'keyup', this.onKeyUp )
  }

  onPointerMove ( event ) {
    this.mouseX = event.pageX
    this.mouseY = event.pageY
  }

  onPointerDown ( event ) {
    event.preventDefault()
    event.stopPropagation()

   this.domElement.focus()

    this.initialRotation = this.object.rotation
    this.initialTilt = this.object.tilt

    this.initialMouseX = event.pageX
    this.initialMouseY = event.pageY
    this.mouseX = event.pageX
    this.mouseY = event.pageY
    this.mouseDragOn = true
  }

  onPointerUp ( event ) {
    event.preventDefault()
    event.stopPropagation()
    this.mouseDragOn = false
  }

  onKeyDown ( event ) {
    switch ( event.keyCode ) {
      case 38: /*up*/
      case 87: /*W*/
      case 37: /*left*/
      case 65: /*A*/
      case 40: /*down*/
      case 83: /*S*/
      case 39: /*right*/
      case 68: /*D*/
      case 82: /*R*/
      case 70: /*F*/
        if ( this.mouse.moveForward || this.mouse.moveBackward || this.mouse.moveLeft || this.mouse.moveRight || this.mouse.moveUp || this.mouse.moveDown) {
        } else {
          this.movementSpeed = .0001
        }
        break
    }

    switch ( event.keyCode ) {
      case 38: /*up*/
      case 87: /*W*/ this.mouse.moveForward = true; break
      case 37: /*left*/
      case 65: /*A*/ this.mouse.moveLeft = true; break
      case 40: /*down*/
      case 83: /*S*/ this.mouse.moveBackward = true; break
      case 39: /*right*/
      case 68: /*D*/ this.mouse.moveRight = true; break
      case 82: /*R*/ this.mouse.moveUp = true; break
      case 70: /*F*/ this.mouse.moveDown = true; break
    }
  }

  onKeyUp ( event ) {
    switch ( event.keyCode ) {
      case 38: /*up*/
      case 87: /*W*/ this.mouse.moveForward = false; break;
      case 37: /*left*/
      case 65: /*A*/ this.mouse.moveLeft = false; break;
      case 40: /*down*/
      case 83: /*S*/ this.mouse.moveBackward = false; break;
      case 39: /*right*/
      case 68: /*D*/ this.mouse.moveRight = false; break;
      case 82: /*R*/ this.mouse.moveUp = false; break;
      case 70: /*F*/ this.mouse.moveDown = false; break;
    }
  }

  reset () {
    this.moveForward = false
    this.moveLeft = false
    this.moveBackward = false
    this.moveRight = false
    this.moveUp = false
    this.moveDown = false
  }

  update ( delta, state ) {
    if ( this.enabled === false ) return

    // DualshockController
    let deadzone = 0.1
    let lspeed = state.devices[0].digital.l3 ? 1/25 : 1/100
    let rspeed = state.devices[0].digital.r3 ? 1/50 : 1/100
    // position
    let lStickX = (state.devices[0].analog.lStickX/127) - 1
    let lStickY = (state.devices[0].analog.lStickY/127) - 1
    if (Math.abs(lStickX) > deadzone) {
      if (lStickX > 0) {
        this.controller.moveLeft = false
        this.controller.moveRight = true
      } else {
        this.controller.moveLeft = true
        this.controller.moveRight = false
      }
    } else {
      this.controller.moveLeft = false
      this.controller.moveRight = false
    }
    if (Math.abs(lStickY) > deadzone) {
      if (lStickY > 0) {
        this.controller.moveForward = false
        this.controller.moveBackward = true
      } else {
        this.controller.moveForward = true
        this.controller.moveBackward = false
      }
    } else {
      this.controller.moveForward = false
      this.controller.moveBackward = false
    }
    // rotation
    let rStickX = (state.devices[0].analog.rStickX/127) - 1
    let rStickY = (state.devices[0].analog.rStickY/127) - 1
    if (Math.abs(rStickX) > deadzone) {
      this.object.rotation -= rStickX * rspeed
    }
    if (Math.abs(rStickY) > deadzone) {
      this.object.tilt -= rStickY * rspeed
    }

    this.moveForward = this.mouse.moveForward || this.controller.moveForward
    this.moveLeft = this.mouse.moveLeft || this.controller.moveLeft
    this.moveBackward = this.mouse.moveBackward || this.controller.moveBackward
    this.moveRight = this.mouse.moveRight || this.controller.moveRight
    this.moveUp = this.mouse.moveUp || this.controller.moveUp
    this.moveDown = this.mouse.moveDown || this.controller.moveDown

    if (this.mouseDragOn) {
      let rotation = this.initialRotation - (this.mouseX - this.initialMouseX)*0.001
      this.object.rotation = rotation
      let tilt = this.initialTilt - (this.mouseY - this.initialMouseY)*0.001
      this.object.tilt = Math.max(Math.min(tilt, Math.PI / 2), -Math.PI / 2)
    }

    if ( this.moveForward || this.moveBackward || this.moveLeft || this.moveRight || this.moveUp || this.moveDown) {
      this.movementSpeed += 0.0005
      this.movementSpeed = Math.min(this.movementSpeed, this.maxSpeed)
    }


    if ( this.moveForward ) {
      let loc = new THREE.Vector2(this.object.x, this.object.y)
      let result = new THREE.Vector2(0+loc.x, -this.movementSpeed+loc.y).rotateAround(loc,-this.object.rotation)

      this.object.x = result.x
      this.object.y = result.y
    }

    if ( this.moveBackward ) {
      let loc = new THREE.Vector2(this.object.x, this.object.y)
      let result = new THREE.Vector2(0+loc.x, this.movementSpeed+loc.y).rotateAround(loc,-this.object.rotation)

      this.object.x = result.x
      this.object.y = result.y
    }

    if ( this.moveLeft ) {
      let loc = new THREE.Vector2(this.object.x, this.object.y)
      let result = new THREE.Vector2(-this.movementSpeed+loc.x, 0+loc.y).rotateAround(loc,-this.object.rotation)

      this.object.x = result.x
      this.object.y = result.y
    }
    if ( this.moveRight ) {
      let loc = new THREE.Vector2(this.object.x, this.object.y)
      let result = new THREE.Vector2(this.movementSpeed+loc.x, 0+loc.y).rotateAround(loc,-this.object.rotation)

      this.object.x = result.x
      this.object.y = result.y
    }


    if ( this.moveUp ) {
      this.object.z += this.movementSpeed
    }

    if ( this.moveDown ) {
      this.object.z -= this.movementSpeed
      this.object.z = Math.max(0, this.object.z)
    }

    // this.object.updateProperties()
  }

}

module.exports = CameraControls