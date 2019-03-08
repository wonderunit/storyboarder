const THREE = require('three')
// const { selectObject, updateObject } = require('../state')

const BonesHelper = require('./BonesHelper')
const BoundingBoxHelper = require('./BoundingBoxHelper')

class DragControls extends THREE.EventDispatcher {

  constructor ( objects, cameras, camera, domElement, onSelectObject, onUpdateObject, onSelectBone ) {
    super()

    this.onSelectObject = onSelectObject
    this.onUpdateObject = onUpdateObject
    this.onSelectBone = onSelectBone

    // this._editor = editor
    this._objects = objects
    this._cameras = cameras
    this._bonesHelper = null
    this._camera = camera
    this._domElement = domElement

    this._plane = new THREE.Plane()
    this._raycaster = new THREE.Raycaster()

    this._mouse = new THREE.Vector2()
    this._offset = new THREE.Vector3()
    this._intersection = new THREE.Vector3()

    this._selected = null
    this._hovered = null
    this._downTarget = null

    this.enabled = true

    this.currentMoveSpeed = 0.001

    this.activate()
  }

  activate () {
    this._domElement.addEventListener( 'pointermove', this.onPointerMove.bind(this), false )
    this._domElement.addEventListener( 'pointerdown', this.onPointerDown.bind(this), false )
    this._domElement.addEventListener( 'pointerup', this.onPointerUp.bind(this), false )
    // this._domElement.addEventListener( 'pointerleave', onDocumentMouseCancel, false )
  }

  deactivate() {
    this._domElement.removeEventListener( 'pointermove', onPointerMove, false )
    this._domElement.removeEventListener( 'pointerdown', onPointerDown, false )
    this._domElement.removeEventListener( 'pointerup', onPointerUp, false )
    // this._domElement.removeEventListener( 'pointerleave', onDocumentMouseCancel, false )
  }

  _updateMouse ( event ) {
    let rect = this._domElement.getBoundingClientRect()
    this._mouse.x = ( ( event.clientX - rect.left ) / rect.width ) * 2 - 1
    this._mouse.y = - ( ( event.clientY - rect.top ) / rect.height ) * 2 + 1
  }

  onPointerMove ( event ) {
    event.preventDefault()
    this._updateMouse( event )

    this._raycaster.setFromCamera( this._mouse, this._camera )

    if ( this._dragTarget && this.enabled ) {
      if ( this._raycaster.ray.intersectPlane( this._plane, this._intersection ) ) {
        let pos = this._intersection.sub( this._offset )
        pos.y = 0
        this.onUpdateObject(this._dragTarget.userData.id, { x: pos.x, y: pos.z /*, z: pos.y*/ })
      }
      this.dispatchEvent( { type: 'drag', object: this._dragTarget } )
      return
    }

    // this._raycaster.setFromCamera( this._mouse, this._camera )
    // let intersects = this._raycaster.intersectObjects( this._objects.map(x => x.object) )

    // if ( intersects.length > 0 ) {
    //   let object = intersects[ 0 ].object
    //   this._plane.setFromNormalAndCoplanarPoint( this._camera.getWorldDirection( this._plane.normal ), object.position )

    //   if ( this._hovered !== object ) {
    //     this.dispatchEvent( { type: 'hoveron', object: object } )
    //     this._domElement.style.cursor = 'pointer'
    //     this._hovered = object
    //   }
    // } else {
    //   if ( this._hovered !== null ) {
    //     this.dispatchEvent( { type: 'hoveroff', object: this._hovered } )
    //     this._domElement.style.cursor = 'auto'
    //     this._hovered = null
    //   }
    // }
  }

  update ( delta, state ) {
    let deltaPos = {x: 0, y: 0}

    if (state.devices[0].digital.left) {
      deltaPos.x = -this.currentMoveSpeed
    }

    if (state.devices[0].digital.right) {
      deltaPos.x = +this.currentMoveSpeed
    }

    if (state.devices[0].digital.up) {
      deltaPos.y = -this.currentMoveSpeed
    }

    if (state.devices[0].digital.down) {
      deltaPos.y = +this.currentMoveSpeed
    }

    if (state.devices[0].digital.left || state.devices[0].digital.right || state.devices[0].digital.up || state.devices[0].digital.down) {
      this.currentMoveSpeed += 0.0005

      if (this._selected) {
        let pos = new THREE.Vector2(this._selected.position.x + deltaPos.x, this._selected.position.z + deltaPos.y).rotateAround(new THREE.Vector2(this._selected.position.x, this._selected.position.z),-this._camera.rotation.y)
        this.onUpdateObject(this._selected.userData.id, { x: pos.x, y: pos.y})
        }
    } else {
      this.currentMoveSpeed = 0.0001
    }
  }

  getFromSprite ( intersects ) {
    let charsintersect = []
    let intersect = intersects[0],
      i = 0

    while (intersects[i])
    {
      //selecting chars if there are more intersection results
      if (intersects[i].object.parent.linkedTo && intersects[i].object.parent.linkedTo.userData.type === "character") {
        intersect = intersects[i]
        charsintersect.push(intersects[i])
        //break
      }
      i++
    }
    if (charsintersect.length > 1)
    {
      intersect = this.getClosestToMouse( charsintersect )
    }
    if (intersect.object instanceof THREE.Sprite)
    {
      let obj = intersect.object.parent.linkedTo
      return [obj, null]
    }
    if (intersect.object.parent instanceof THREE.Group)
    {
      let obj = intersect.object.parent
      return [obj, null]
    }
  }

  // putPoint ( coord, color )
  // {
  //   let scene = this._cameras[0].parent

  //   let po = new THREE.SphereBufferGeometry(0.1)
  //   let ma = new THREE.MeshBasicMaterial({color:color})
  //   let me = new THREE.Mesh(po, ma)
  //   me.position.copy(coord)
  //   scene.add(me)

  // }

  getClosestToMouse( intersectionArray )
  {
    
    let closest = intersectionArray[0],
      linkedPosition = new THREE.Vector3()
    linkedPosition = intersectionArray[0].object.parent.linkedTo.position.clone()
    linkedPosition.y = 0

    let closestDist = linkedPosition.distanceTo(intersectionArray[0].point)

    
    for (let intersector of intersectionArray)
    {
      linkedPosition = intersector.object.parent.linkedTo.position.clone()
      linkedPosition.y = 0
      //this.putPoint(linkedPosition, "#990000")
      let newDist = linkedPosition.distanceTo(intersector.point)
      //this.putPoint(intersector.point, "#009900")
      if (newDist<closestDist){
        closestDist = newDist
        closest = intersector
      }
    }
    return closest  
  }

  getObjectAndBone ( intersect ) {
    if (intersect.object.userData.type === 'hitter_light')
    {
      let obj = intersect.object.parent
      return [obj, null]
    }

    if (intersect.object instanceof THREE.Mesh && intersect.object.userData.type === 'hitter' )
    {
      let obj = intersect.object.parent.object3D
      return [obj, null]
    }

    if (intersect.object.parent instanceof THREE.Group)
    {
      let obj = intersect.object.parent
      return [obj, null]
    }

    let isBone = intersect.object.parent instanceof BonesHelper

    let object = isBone
      ? intersect.object.parent.root.parent
      : intersect.object

    let bone = isBone
      // object.parent.root.parent.skeleton.bones
      //   .find(b => b.uuid === o.object.userData.bone)
      ? intersect.bone
      : null

    return [object, bone]
  }

  getIntersectionSprites ( objects, cameras ) {
    let allIntersectors = []
    for (var o of objects)
    {      
      if (o instanceof THREE.Group && o.children[0] instanceof THREE.Mesh)
      {
        //box is group
        if (o.visible) allIntersectors.push(o.children[0])
      }
      if (o instanceof THREE.Object3D && o.userData.type === 'light'){
        // light
        allIntersectors.push( o.orthoIcon.icon )
      }
      if (o instanceof THREE.Object3D && o.userData.type === 'character')
      {
        //character
        allIntersectors.push( o.orthoIcon.icon )        
      }

      if (o instanceof THREE.Object3D && o.userData.type === 'volume')
      {
        //volume
        allIntersectors.push( o.orthoIcon.icon )
      }
    }    
    for ( o of cameras ) // cameras
    {
      allIntersectors.push ( o.orthoIcon.icon )
    }
    return allIntersectors
  }

  getIntersectionObjects (objects, camera) {
    let allIntersectionMeshes = []
    for (var o of objects)
    {
      if (o instanceof THREE.Mesh) {
        if (o.visible) allIntersectionMeshes.push(o)
      }

      if (o instanceof THREE.Group && o.children[0] instanceof THREE.Mesh)
      {
        if (o.visible) allIntersectionMeshes.push(o.children[0])
      }

      if (o instanceof THREE.Object3D && o.userData.type === 'light'){
        allIntersectionMeshes.push(o.hitter)
      }
      if (o instanceof THREE.Object3D && o.userData.type === 'character')
      {
        if ( camera.isOrthographicCamera ) allIntersectionMeshes.push( o.icon )
        else allIntersectionMeshes = allIntersectionMeshes.concat(o.bonesHelper.hit_meshes)
      }
    }
    return allIntersectionMeshes
  }

  onPointerDown ( event ) {
    event.preventDefault()
    this.dispatchEvent( { type: 'pointerdown' } )
    this._raycaster.setFromCamera( this._mouse, this._camera )

    let shouldReportSelection = false
    let checkIntersectionsWithMeshes = this._camera.isOrthographicCamera ? this.getIntersectionSprites( this._objects, this._cameras ) : this.getIntersectionObjects(this._objects, this._camera)
    let intersects = this._raycaster.intersectObjects( checkIntersectionsWithMeshes )
    if ( intersects.length > 0 ) {
      this.onSelectBone( null )  // deselect bone is any selected
      let object = this._camera.isOrthographicCamera ? this.getFromSprite(intersects)[0] : this.getObjectAndBone( intersects[ 0 ] )[0]
      if (
        // is the camera is orthographic (which means, start dragging on the first click)
        this._camera.isOrthographicCamera
      ) {
        this._selected = object
        this._downTarget = object
        shouldReportSelection = true
      }
        // if we already have a selection and this object matches it ("double-click")
      if (this._selected === object) {

        // is the BonesHelper being selected?
        let hits
        let bone
        if (this._bonesHelper) {
          hits = this._raycaster.intersectObject( this._bonesHelper )
          bone = hits.length && this.getObjectAndBone( hits[ 0 ] )[1]
        }

        // ... select bone (if any) ...
        if (this._camera.isPerspectiveCamera) {
          if (bone) {
            this.onSelectBone( bone.uuid )
          } else {
            this.onSelectBone( null )
          }
        }

        // ... and then we want to start dragging that selected object
        this._dragTarget = this._selected

        this._domElement.style.cursor = 'move'

        if (this._camera.isOrthographicCamera) {
          this._plane.setFromNormalAndCoplanarPoint( this._camera.position.clone().normalize(), object.position )
        } else {
          this._plane.setFromNormalAndCoplanarPoint( this._camera.getWorldDirection( this._plane.normal ), object.position )
        }

        if ( this._raycaster.ray.intersectPlane( this._plane, this._intersection ) ) {
          this._offset.copy( this._intersection ).sub( this._selected.position )
        }

        if (shouldReportSelection) {
          this.onSelectObject( this._selected.userData.id )
        }
        this.dispatchEvent( { type: 'dragstart', object: this._dragTarget } )

      } else {
        // otherwise, we just want to select
        this._downTarget = object
      }

    } else {
      this._downTarget = null

      let selectionId = this._selected && this._selected.userData.id
      let activeCameraId = this._camera && this._camera.userData.id
      let currentSelectionIsActiveCamera = (
        selectionId != null &&
        activeCameraId === selectionId
      )
      if (!currentSelectionIsActiveCamera) {
        this._selected = null
        this.onSelectObject(activeCameraId)
      }

      this.onSelectBone(null)
    }
  }

  onPointerUp ( event ) {
    event.preventDefault()

    this._raycaster.setFromCamera( this._mouse, this._camera )

    let checkIntersectionsWithMeshes = this._camera.isOrthographicCamera ? this.getIntersectionSprites( this._objects, this._cameras ) : this.getIntersectionObjects(this._objects, this._camera)

    let intersects = this._raycaster.intersectObjects( checkIntersectionsWithMeshes )
    let object
    let bone
    if ( intersects.length > 0 ) {
      if (this._camera.isOrthographicCamera)
        [object, bone] = this.getFromSprite( intersects )
      else
        [object, bone] = this.getObjectAndBone( intersects[ 0 ] )
    }

    // if we're dragging
    if (this._dragTarget) {
      this.dispatchEvent( { type: 'dragend', object: this._dragTarget } )
      this._dragTarget = null

      this._domElement.style.cursor = 'auto' // this._hovered ? 'pointer' : 'auto'

    // otherwise, if we match the object from mousedown
  } else if ( object && this._downTarget === object ) {
      this._selected = this._downTarget
      if (this._camera.isOrthographicCamera) this.onSelectObject (  )
      else this.onSelectObject( this._selected.userData.id )
    }
  }

  setCamera ( camera ) {    
    this._camera = camera
  }

  setObjects ( objects ) {
    this._objects = objects
  }

  setBones ( helper ) {
    this._bonesHelper = helper
  }

  setSelected ( object ) {
    this._selected = object
  }

  setCameras ( cameras ) {    
    this._cameras = cameras
  }
}

module.exports = DragControls
