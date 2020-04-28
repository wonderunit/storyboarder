import * as THREE from 'three'
import KeyCommandsSingleton from './components/KeyHandler/KeyCommandsSingleton'
import ResourceManager from '../shared/IK/ResourceManager'
class CameraControls {
  
  constructor ( object, domElement, options = {}, target = null ) {
    this._object = object
    this._prevValues = {...object}
    this.domElement = domElement
    this.enabled = true
    
    this.moveAnalogue = false
    
    this.movementSpeed = .0005
    this.maxSpeed = 0.07
    this.zoomSpeed = 0
    
    this.keydowns = new Set()

    this.target = target;

    this.onPointerMove = this.onPointerMove.bind(this)
    this.onPointerDown = this.onPointerDown.bind(this)
    this.onPointerUp = this.onPointerUp.bind(this)
    this.onKeyDown = this.onKeyDown.bind(this)
    this.onKeyUp = this.onKeyUp.bind(this)
    
    this.onWheel = this.onWheel.bind(this)
    
    this.isMoveOn = false
    this.runMode = false
    
    this.undoGroupStart = options.undoGroupStart
    this.undoGroupEnd = options.undoGroupEnd
    this.onChange = options.onChange
    this.intializeEvents()
  }

  set Target(target) {
    if(target instanceof THREE.Object3D) {
      this.target = target.getWorldPosition()
      this.isLockedOnObject = true
    } else if(target instanceof THREE.Vector3) {
      this.target = target
      this.isLockedOnObject = true
      
    } else {
      this.target = null
      this.isLockedOnObject = false
    }
  }
  
  set object(value) {
    this._object = value
    this._prevValues = {...value}
  }

  intializeEvents() {
    window.addEventListener( 'pointermove', this.onPointerMove, false )
    KeyCommandsSingleton.getInstance().addKeyCommand({
      key: "camera-controls", 
      keyCustomCheck: this.onKeyDown,
      value: () => {}})
    window.addEventListener( 'keyup', this.onKeyUp, false )
    this.domElement.addEventListener("wheel", this.onWheel, false )
  }
  
  dispose () {
    window.removeEventListener( 'pointermove', this.onPointerMove )
    KeyCommandsSingleton.getInstance().removeKeyCommand({key: "camera-controls"})
    window.removeEventListener( 'keyup', this.onKeyUp )
    this.domElement.removeEventListener("wheel", this.onWheel )
  }
  
  onPointerMove ( event ) {
    
    this.mouseX = event.pageX
    this.mouseY = event.pageY
  }
  
  onPointerDown ( event ) {
    event.preventDefault()
    event.stopPropagation()
    
    this.domElement.focus()
    
    this.initialRotation = this._object.rotation
    this.initialTilt = this._object.tilt
    
    this.initialMouseX = event.pageX
    this.initialMouseY = event.pageY

    this.prevMouseX = this.initialMouseX
    this.prevMouseY = this.initialMouseY

    this.mouseX = event.pageX
    this.mouseY = event.pageY
    this.mouseDragOn = true
    
    if(this.enabled === true ) {
      this.undoGroupStart()
    }
    if(event.button === 2) {
      this.isRightButtonPressed = true
    }
  
    this.onChange({active: this.mouseDragOn, object: this._object})
  }
  
  onPointerUp ( event ) {
    event.preventDefault()
    
    if (this.mouseDragOn && this.enabled === true ) {
      this.onChange({active: false, object: this._object})
      this.undoGroupEnd()
    }
    this.target = this.isLockedOnObject ? this.target : null
    this.mouseDragOn = false
    this.isRightButtonPressed = false
  }
  
  addKey (key) {
    if (this.keydowns.size === 0) {
      this.undoGroupStart()
    }
    this.keydowns.add(key)
  }
  removeKey (key) {
    this.keydowns.delete(key)
    if (this.keydowns.size === 0) {
      this.undoGroupEnd()
    }
  }
  
  
  onKeyDown ( event ) {
    // Ignore Cmd + R (reload) and Cmd + D (duplicate)
    if (event.metaKey) return
    this.updateObjectInfo()
    let shouldRemoveKey = true
    switch ( event.keyCode ) {
      case 16: /*control*/
        this.shiftPressed = true
        break;
      case 17: /*control*/
        this.onChange({active: false, object: this._object})
        break;
      case 18: /*alt*/
        this.altPressed = true
        break;
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
        if ( this.moveForward || this.moveBackward || this.moveLeft || this.moveRight || this.moveUp || this.moveDown) {
        } else {
          this.movementSpeed = .0001
        }
        break
      case 16:
        this.runMode = true
        break
      default:
        shouldRemoveKey = false
    }
    
    switch ( event.keyCode ) {
      case 17: /*control*/ this.controlPressed = true; break;
      case 38: /*up*/
      case 87: /*W*/ this.moveForward = true; break
      case 37: /*left*/
      case 65: /*A*/ this.moveLeft = true; break
      case 40: /*down*/
      case 83: /*S*/ this.moveBackward = true; break
      case 39: /*right*/
      case 68: /*D*/ this.moveRight = true; break
      case 82: /*R*/ this.moveUp = true; break
      case 70: /*F*/ this.moveDown = true; break
      default:
        shouldRemoveKey = false
    }
    if(shouldRemoveKey)
      this.addKey(event.keyCode)
  }
  
  onKeyUp ( event ) {
    let shouldRemoveKey = true
    switch ( event.keyCode ) {
      case 16: /*control*/
        this.shiftPressed = false
        break;
      case 17: /*control*/ 
        this.controlPressed = false
        this.target = this.isLockedOnObject ? this.target : null
        break;
      case 18: /*alt*/
        this.altPressed = false
        break;
      case 38: /*up*/
      case 87: /*W*/ this.moveForward = false; break;
      case 37: /*left*/
      case 65: /*A*/ this.moveLeft = false; break;
      case 40: /*down*/
      case 83: /*S*/ this.moveBackward = false; break;
      case 39: /*right*/
      case 68: /*D*/ this.moveRight = false; break;
      case 82: /*R*/ this.moveUp = false; break;
      case 70: /*F*/ this.moveDown = false; break;
      case 16: /* shift */ this.runMode = false; break;
      default:
        shouldRemoveKey = false
    }
    if(shouldRemoveKey)
      this.removeKey(event.keyCode)
  }
  
  onWheel ( event ) {
    this.zoomSpeed += (event.deltaY * 0.005)
  }
  
  
  reset () {
    this.moveForward = false
    this.moveLeft = false
    this.moveBackward = false
    this.moveRight = false
    this.moveUp = false
    this.moveDown = false
    this.moveAnalogue = false
  }
  
  isChanged() {
    return (
        this._object.x !== this._prevValues.x ||
        this._object.y !== this._prevValues.y ||
        this._object.z !== this._prevValues.z ||
        this._object.rotation !== this._prevValues.rotation ||
        this._object.tilt !== this._prevValues.tilt ||
        this._object.fov !== this._prevValues.fov
    )
  }
  
  static getMovedState (object, movementSpeed) {
    let loc = new THREE.Vector2(object.x, object.y)
    let result = new THREE.Vector2(movementSpeed.x + loc.x, movementSpeed.y + loc.y).rotateAround(loc,-object.rotation)
    
    return {
      ...object,
      x: result.x,
      y: result.y
    }
  }
  
  update ( delta, state ) {
    
    if ( this.enabled === false ) return
    
    this._object.fov += this.zoomSpeed
    this._object.fov = Math.max(1, this._object.fov)
    this._object.fov = Math.min(71, this._object.fov)
    
    this.zoomSpeed = this.zoomSpeed * 0.0001
    
    // DualshockController
    let deadzone = 0.1
    
    // position
    let lStickX = (state.devices[0].analog.lStickX/127) - 1
    let lStickY = (state.devices[0].analog.lStickY/127) - 1
    
    if (Math.abs(lStickX) > deadzone || Math.abs(lStickY) > deadzone) {
      this.moveAnalogue = true
    } else {
      this.moveAnalogue = false
    }
    let resourceManager = ResourceManager.getInstance()
    if (this.mouseDragOn) {
      let camera = resourceManager.getCustom(THREE.PerspectiveCamera)
      camera.position.set(this._object.x, this._object.z, this._object.y)
      camera.rotation.x = 0
      camera.rotation.z = 0
      camera.rotation.y = this._object.rotation
      camera.rotateX(this._object.tilt)
      camera.rotateZ(this._object.roll)
      camera.updateMatrixWorld(true)
      // Camera Orbiting logic
      if(this.controlPressed || this.isRightButtonPressed) {
        let spherical = resourceManager.getCustom(THREE.Spherical)
        let offset = resourceManager.getVector3()

        let cameraClone 
        let cloneToOriginDelta
        // Checks if locked on object and calculates rotation delta 
        if(this.isLockedOnObject) {
          cameraClone = resourceManager.getCustom(THREE.PerspectiveCamera).copy(camera)
          cameraClone.lookAt( this.target )
          cameraClone.updateMatrixWorld(true)
  
          cloneToOriginDelta = resourceManager.getQuaternion()
          cloneToOriginDelta.multiply(cameraClone.worldQuaternion().conjugate())
          cloneToOriginDelta.multiply(camera.worldQuaternion())
          cameraClone = cameraClone.copy(camera)
        }
        // Checks if we have target and creates a targe in the center of view with distance of 7 if needed  
        if(!this.target) {
          let cameraDirection = resourceManager.getVector3()
          let origin = resourceManager.getVector3().setFromMatrixPosition(camera.matrixWorld)
          camera.getWorldDirection(cameraDirection)
          cameraDirection.normalize()

          cameraDirection.setLength(7)
          this.target = cameraDirection.clone().add(origin)
    
          camera.updateMatrixWorld(true)
          resourceManager.release(cameraDirection)
          resourceManager.release(origin)
        }

        //#region Main orbiting logic
        let target = this.target
        let customUp = resourceManager.getVector3().set( 0, 1, 0 )
        let quat = resourceManager.getQuaternion().setFromUnitVectors( camera.up, customUp )
        let quatInverse = quat.clone().inverse()

        offset.subVectors(camera.position, target)
        offset.applyQuaternion(quat)
        spherical.setFromVector3(offset)
        let rotation = (this.mouseX - this.prevMouseX)*0.005
        let tilt = (this.mouseY - this.prevMouseY)*0.005
  
        spherical.theta += rotation
        spherical.phi += tilt
        spherical.makeSafe();

        offset.setFromSpherical( spherical );
			  offset.applyQuaternion( quatInverse );

        camera.position.addVectors( target, offset );
        camera.lookAt( target );
        //#endregion 
        // Applies change of basis to maintain object initial rotation in new rotation and position
        if(this.isLockedOnObject) { 
          let cloneGlobalQuat = camera.worldQuaternion()
          cloneGlobalQuat.multiply(cloneToOriginDelta)
          let transformMatrix = resourceManager.getMatrix4()
          transformMatrix.multiply(cameraClone.matrix)
          transformMatrix.multiply(cameraClone.matrixWorld.inverse())
          cloneGlobalQuat.applyMatrix(transformMatrix)
          camera.quaternion.copy(cloneGlobalQuat)
          camera.updateMatrixWorld(true)
          resourceManager.release(transformMatrix)
        }

        let position = camera.position
        let rot = resourceManager.getCustom(THREE.Euler).setFromQuaternion(camera.quaternion, "YXZ")

        // Save camera changes
        this._object.tilt = rot.x
        this._object.rotation = rot.y
        this._object.x = position.x
        this._object.y = position.z
        this._object.z = position.y
        cameraClone && resourceManager.release(cameraClone)
        cloneToOriginDelta && resourceManager.release(cloneToOriginDelta)

        resourceManager.release(customUp)
        resourceManager.release(rot)
        resourceManager.release(quat)
        resourceManager.release(spherical)
        resourceManager.release(offset)
      } 
      // Camera dollying and trucking
      else if(this.shiftPressed) {
        let verticalDelta = (this.mouseY - this.prevMouseY)*0.015
    
        /* 
        let loc = new THREE.Vector2(this._object.x, this._object.y)
        let result = new THREE.Vector2(horizontalDelta+loc.x, verticalDelta+loc.y).rotateAround(loc,-this._object.rotation)

        this._object.x = result.x
        this._object.y = result.y */
  
        let cameraVerticalDirection = resourceManager.getVector3()
        camera.getWorldDirection(cameraVerticalDirection)
        cameraVerticalDirection.normalize()

        cameraVerticalDirection.multiplyScalar(verticalDelta)
      
        camera.position.sub(cameraVerticalDirection)
        let position = camera.position
        this._object.x = position.x
        this._object.y = position.z
        this._object.z = position.y
        resourceManager.release(cameraVerticalDirection)
      }
      else if(this.altPressed) {
        let horizontalDelta = (this.mouseX - this.prevMouseX)*0.005
        let cameraHorizontalDirection = resourceManager.getVector3()
        let e = camera.matrixWorld.elements;
        
        cameraHorizontalDirection.set( e[ 0 ], e[ 1 ], e[ 2 ] ).normalize();
        cameraHorizontalDirection.multiplyScalar(horizontalDelta)
        camera.position.add(cameraHorizontalDirection)
        let position = camera.position
        this._object.x = position.x
        this._object.y = position.z
        this._object.z = position.y
        resourceManager.release(cameraHorizontalDirection)
      }
      // Camera panning logic
      else {
        let rotation = (this.mouseX - this.prevMouseX)*0.001
        this._object.rotation -= rotation
        let tilt = (this.mouseY - this.prevMouseY)*0.001
        this._object.tilt -= tilt 
        this._object.tilt = Math.max(Math.min(this._object.tilt, Math.PI / 2), -Math.PI / 2)
      }
      this.prevMouseX = this.mouseX
      this.prevMouseY = this.mouseY
      resourceManager.release(camera)
    } 
    // rotation
    let rStickX = (state.devices[0].analog.rStickX/127) - 1
    let rStickY = (state.devices[0].analog.rStickY/127) - 1
    
    if (Math.abs(rStickX) > deadzone || Math.abs(rStickY) > deadzone) {
      this._object.rotation -= (rStickX * 0.03) * Math.abs(Math.pow(rStickX, 2))
      this._object.tilt -= (rStickY * 0.02) * Math.abs(Math.pow(rStickY, 2))
      this._object.tilt = Math.max(Math.min(this._object.tilt, Math.PI / 2), -Math.PI / 2)
    }
    
    if (this.moveAnalogue) {
      let loc = new THREE.Vector2(this._object.x, this._object.y)
      let magX = (lStickX*0.07) * (Math.abs(Math.pow(lStickX, 2)))
      let magY = (lStickY*0.1) * (Math.abs(Math.pow(lStickY, 2)))
      if (state.devices[0].digital.l3) {
        magY *= 4.0
      }
      let result = new THREE.Vector2(magX+loc.x, magY+loc.y).rotateAround(loc,-this._object.rotation)
      this._object.x = result.x
      this._object.y = result.y
    }
    
    this.isMoveOn = false
    if ( this.moveForward || this.moveBackward || this.moveLeft || this.moveRight || this.moveUp || this.moveDown) {
      if (this.runMode) {
        this.movementSpeed += (0.002/0.0166666)*delta
        this.movementSpeed = Math.min(this.movementSpeed, ((this.maxSpeed*5)/0.0166666)*delta)
      } else {
        this.movementSpeed += (0.0007/0.0166666)*delta
        this.movementSpeed = Math.min(this.movementSpeed, (this.maxSpeed/0.0166666)*delta)
      }
      
      this.isMoveOn = true
    }
    
    if ( this.moveForward ) {
      let loc = resourceManager.getCustom(THREE.Vector2).set(this._object.x, this._object.y)
      let result = resourceManager.getCustom(THREE.Vector2).set(0+loc.x, -this.movementSpeed+loc.y).rotateAround(loc,-this._object.rotation)
      
      this._object.x = result.x
      this._object.y = result.y
      resourceManager.release(loc)
      resourceManager.release(result)
    }
    
    if ( this.moveBackward ) {
      let loc = resourceManager.getCustom(THREE.Vector2).set(this._object.x, this._object.y)
      let result = resourceManager.getCustom(THREE.Vector2).set(0+loc.x, this.movementSpeed+loc.y).rotateAround(loc,-this._object.rotation)
      
      this._object.x = result.x
      this._object.y = result.y
      resourceManager.release(loc)
      resourceManager.release(result)
    }
    
    if ( this.moveLeft ) {
      let loc = resourceManager.getCustom(THREE.Vector2).set(this._object.x, this._object.y)
      let result = resourceManager.getCustom(THREE.Vector2).set(-this.movementSpeed+loc.x, 0+loc.y).rotateAround(loc,-this._object.rotation)
      
      this._object.x = result.x
      this._object.y = result.y
      resourceManager.release(loc)
      resourceManager.release(result)
    }
    if ( this.moveRight ) {
      let loc = resourceManager.getCustom(THREE.Vector2).set(this._object.x, this._object.y)
      let result = resourceManager.getCustom(THREE.Vector2).set(this.movementSpeed+loc.x, 0+loc.y).rotateAround(loc,-this._object.rotation)
      
      this._object.x = result.x
      this._object.y = result.y
      resourceManager.release(loc)
      resourceManager.release(result)
    }

    if ( this.moveUp ) {
      this._object.z += this.movementSpeed
    }
    
    if (state.devices[0].analog.r2) {
      this._object.z -= ((state.devices[0].analog.r2/127.0)*0.002)*(Math.pow((state.devices[0].analog.r2/127.0),2))
      this._object.z = Math.max(0, this._object.z)
    }
    
    if ( this.moveDown ) {
      this._object.z -= this.movementSpeed
      this._object.z = Math.max(0, this._object.z)
    }
    
    if (state.devices[0].analog.l2) {
      this._object.z += ((state.devices[0].analog.l2/127.0)*0.002)*(Math.pow((state.devices[0].analog.l2/127.0),2))
    }
    
    if (this.isMoveOn || this.mouseDragOn || this.isChanged()) {
      this.onChange({active: this.mouseDragOn && !this.isMoveOn, object: this._object})
    }
    
    this._prevValues = {...this._object}

    
    // if (state.devices[0].digital.r1 || state.devices[0].digital.l1) {
    //   this.zoomSpeed += 0.002
    //   this.zoomSpeed = Math.min(this.zoomSpeed, 0.1)
    
    // } else {
    //   this.zoomSpeed = 0.001
    // }
    
    
    // if (state.devices[0].digital.r1) {
    //   this.object.fov -= this.zoomSpeed
    //   this.object.fov = Math.max(3, this.object.fov)
    // }
    // if (state.devices[0].digital.l1) {
    //   this.object.fov += this.zoomSpeed
    //   this.object.fov = Math.min(71, this.object.fov)
    // }
    // this.object.updateProperties()
  }
  
}

CameraControls.objectFromCameraState = cameraState =>
    ({
      x: cameraState.x,
      y: cameraState.y,
      z: cameraState.z,
      rotation: cameraState.rotation,
      tilt: cameraState.tilt,
      fov: cameraState.fov,
      roll: cameraState.roll,
      
    })

export default CameraControls
