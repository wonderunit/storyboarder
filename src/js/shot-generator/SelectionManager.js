const { useState, useEffect, useLayoutEffect, useRef, useMemo, useContext } = React = require('react')
const { connect } = require('react-redux')

const {
  selectObject,
  selectObjectToggle,
  selectBone,
  updateObjects,

  undoGroupStart,
  undoGroupEnd,

  getSelections,
  getActiveCamera
} = require('../shared/reducers/shot-generator')

function getObjectsFromIcons ( objects ) {
  return objects
      // visible objects
      .filter(o => o.visible)
      // with icons
      .filter(o => o.orthoIcon && o.orthoIcon.icon)
      // return the icons
      .map(o => o.orthoIcon.icon)
      // and ...
      .concat(
        // ... add directly visible objects (like the box)
        objects
          .filter(o => o.type === 'Group' && o.children[0] && o.children[0].isMesh)
          .filter(o => o.visible)
          .map(o => o.children[0])
      )
}

function getObjectsFromCameraView (objects) {
  let results = []

  for (let o of objects) {
    if (o.userData.type === 'object') {
      if (o.type === 'Group' && o.children[0].isMesh) {
        if (o.visible) results.push(o.children[0])
      }
    }

    if (o.userData.type === 'light') {
      results.push(o.hitter)
    }

    if (o.userData.type === 'character') {
      // if the mesh has loaded
      if (o.bonesHelper) {
        results = results.concat(o.bonesHelper.hit_meshes)
      }
    }

    // don't allow selection of: camera, volume
  }

  return results
}

const getIntersectionTarget = intersect => {
  if (intersect.object.type === 'Sprite') {
    return intersect.object.parent.linkedTo
  }

  // light
  if (intersect.object.userData.type === 'hitter_light') {
    return intersect.object.parent
  }

  // character
  if (intersect.object.userData.type === 'hitter' ) {
    return intersect.object.parent.object3D
  }

  // object
  if (intersect.object.parent.userData.type === 'object') {
    return intersect.object.parent
  }
}

const SelectionManager = connect(
  state => ({
    selections: getSelections(state),
    activeCamera: getActiveCamera(state)
  }),
  {
    selectObject,
    selectObjectToggle,
    selectBone,
    updateObjects,

    undoGroupStart,
    undoGroupEnd
  }
)(
  ({
    SceneContext,
    camera,
    el,

    selectOnPointerDown,
    useIcons,

    selections,
    activeCamera,

    selectObject,
    selectObjectToggle,
    selectBone,
    updateObjects,

    transition,
    
    undoGroupStart,
    undoGroupEnd
  }) => {

  const { scene } = useContext(SceneContext)

  const [lastDownId, setLastDownId] = useState()
  const [dragTarget, setDragTarget] = useState()

  const intersectables = scene.children.filter(o =>
    o.userData.type === 'object' ||
    o.userData.type === 'character' ||
    o.userData.type === 'light' ||
    o.userData.type === 'volume' ||
    (useIcons && o.isPerspectiveCamera)
  )

  const mouse = event => {
    const rect = el.getBoundingClientRect()
    return {
      x: ( ( event.clientX - rect.left ) / rect.width ) * 2 - 1,
      y: - ( ( event.clientY - rect.top ) / rect.height ) * 2 + 1
    }
  }

  const getIntersects = ({ x, y }, camera, useIcons) => {
    let raycaster = new THREE.Raycaster()
    raycaster.setFromCamera({ x, y }, camera )

    let intersects = useIcons
      ? raycaster.intersectObjects( getObjectsFromIcons(intersectables) )
      : raycaster.intersectObjects( getObjectsFromCameraView(intersectables) )

    return intersects
  }

  //
  //
  // drag behavior
  //
  const raycaster = useRef()
  const plane = useRef()
  const intersection = useRef()
  const offsets = useRef()
  const prepareDrag = (target, { x, y, useIcons }) => {
    if (!raycaster.current) raycaster.current = new THREE.Raycaster()
    if (!plane.current) plane.current = new THREE.Plane()
    if (!intersection.current) intersection.current = new THREE.Vector3()

    offsets.current = []

    raycaster.current.setFromCamera({ x, y }, camera )

    if (useIcons) {
      plane.current.setFromNormalAndCoplanarPoint( camera.position.clone().normalize(), target.position )
    } else {
      plane.current.setFromNormalAndCoplanarPoint( camera.getWorldDirection( plane.current.normal ), target.position )
    }

    // remember the offsets of every selected object
    if ( raycaster.current.ray.intersectPlane( plane.current, intersection.current ) ) {
      for (let selection of selections) {
        let child = scene.children.find(child => child.userData.id === selection)
        offsets.current[selection] = new THREE.Vector3().copy( intersection.current ).sub( child.position )
      }
    } else {
      for (let selection of selections) {
        offsets.current[selection] = new THREE.Vector3()
      }
    }
  }
  const drag = (target, mouse) => {
    raycaster.current.setFromCamera( mouse, camera )
    
    if ( raycaster.current.ray.intersectPlane( plane.current, intersection.current ) ) {
      let changes = {}
      for (selection of selections) {
        let { x, z } = intersection.current.clone().sub( offsets.current[selection] ).setY(0)
        changes[selection] = { x, y: z }
      }
      updateObjects(changes)
    }
  }
  const endDrag = () => {
    
  }
  useMemo(() => {
    if (dragTarget) {
      let { target, x, y } = dragTarget
      prepareDrag(target, { x, y, useIcons })
    }
  }, [dragTarget])

  const onPointerDown = event => {
    event.preventDefault()

    // make sure we clear focus of any text fields
    transition('TYPING_EXIT')

    // get the mouse coords
    const { x, y } = mouse(event)
    // find all the objects that intersect the mouse coords
    // (uses a different search method if useIcons is true)
    let intersects = getIntersects({ x, y }, camera, useIcons)

    // if no objects intersected
    if (intersects.length === 0) {
      // cancel any active dragging
      endDrag()
      // clear the drag target
      setDragTarget(null)

      // don't do anything on the next pointerup
      setLastDownId(null)

      // select the active camera
      selectObject(activeCamera)

      // don't select any bone
      selectBone(null)

    } else {
      let shouldDrag = false
      let target

      // prefer the nearest character to the click
      if (useIcons) {
        // how many characters intersections are there?
        let charactersIntersects = intersects.filter(i => i.object.parent.linkedTo && i.object.parent.linkedTo.userData.type === 'character')

        let intersect
        // if there are many character intersections
        if (charactersIntersects.length > 1) {
          // find the character intersection closest to the intersection point
          let closest = charactersIntersects[0]

          let linkedPosition = charactersIntersects[0].object.parent.linkedTo.position.clone().setY(0)
          let closestDist = linkedPosition.distanceTo(charactersIntersects[0].point)

          for (let intersector of charactersIntersects) {
            linkedPosition = intersector.object.parent.linkedTo.position.clone().setY(0)
            let newDist = linkedPosition.distanceTo(intersector.point)
            if (newDist < closestDist){
              closestDist = newDist
              closest = intersector
            }
          }

          intersect = closest
        } else if (charactersIntersects.length == 1) {
          // if there is only one character intersection, prefer that
          intersect = charactersIntersects[0]
        } else {
          // otherwise, grab the first intersection available
          intersect = intersects[0]
        }

        target = getIntersectionTarget(intersect)
      } else {
        target = getIntersectionTarget(intersects[0])
      }

      // if there are 1 or more selections
      if (selections.length) {
        // and we're not in icon mode
        if (!useIcons) {
          // if only one character is selected ...
          if (target.userData.type === 'character' &&
              selections.length === 1 &&
              //  and its the one we pointerdown'd ...
              selections[0] === target.userData.id
            ) {
            // see if we pointerdown'd a bone ...
            let raycaster = new THREE.Raycaster()
            raycaster.setFromCamera({ x, y }, camera )
            let hits = raycaster.intersectObject(target.bonesHelper)

            // select the bone
            if (hits.length) {
              selectObject(target.userData.id)
              setLastDownId(null)

              selectBone(hits[0].bone.uuid)

              // consider a bone selection the start of a drag
              setDragTarget({ target, x, y })
              return
            }
          }
        }

        if (
          // additional click is on an existing selected object
          selections.includes(target.userData.id)
        ) {
          shouldDrag = true
        }
      }

      selectBone(null)

      if (selectOnPointerDown) {
        if (event.shiftKey) {
          // if there is only one selection and it is the active camera
          if (selections.length === 1 && selections[0] === activeCamera) {
            // replace the selection with the object
            selectObject(target.userData.id)
          } else {
            // toggle the object in the multi-selection
            selectObjectToggle(target.userData.id)
          }
        } else {
          // if the pointerup'd target is not part of the multi-selection
          if (!selections.includes(target.userData.id)) {
            // clear the multi-selection and select just the target
            selectObject(target.userData.id)
          }
        }
        shouldDrag = true
      } else {
        setLastDownId(target.userData.id)
      }

      if (shouldDrag) {
        undoGroupStart()
        setDragTarget({ target, x, y })
      }
    }
  }

  const onPointerMove = event => {
    event.preventDefault()

    const { x, y } = mouse(event)

    if (dragTarget) {
      drag(dragTarget.target, { x, y })
    }
  }

  const onPointerUp = event => {
    event.preventDefault()

    const { x, y } = mouse(event)

    if (dragTarget) {
      endDrag()
      setDragTarget(null)

      undoGroupEnd()
    }

    if (event.target === el) {
      if (!selectOnPointerDown) {
        let intersects = getIntersects({ x, y }, camera, useIcons)

        if (intersects.length === 0) {
          // selectObject(undefined)
          // selectBone(null)
          setLastDownId(null)
          // 
          // endDrag()
          // setDragTarget(null)

        } else {
          let target = getIntersectionTarget(intersects[0])

          if (target.userData.id == lastDownId) {
            if (event.shiftKey) {
              // if there is only one selection and it is the active camera
              if (selections.length === 1 && selections[0] === activeCamera) {
                // replace the selection with the object
                selectObject(target.userData.id)
              } else {
                // toggle the object in the multi-selection
                selectObjectToggle(target.userData.id)
              }
            } else {
              // if the pointerup'd target is not part of the multi-selection
              if (!selections.includes(target.userData.id)) {
                // clear the multi-selection and select just the target
                selectObject(target.userData.id)
              }
            }
            selectBone(null)
          }
        }
      }
    }

    setLastDownId(null)
  }

  useLayoutEffect(() => {
    el.addEventListener('pointerdown', onPointerDown)
    el.addEventListener('pointermove', onPointerMove)
    document.addEventListener('pointerup', onPointerUp)

    return function cleanup () {
      el.removeEventListener('pointerdown', onPointerDown)
      el.removeEventListener('pointermove', onPointerMove)
      document.removeEventListener('pointerup', onPointerUp)
    }
  }, [onPointerDown, onPointerUp, onPointerMove])

  useLayoutEffect(() => {
    if (dragTarget) {
      el.style.cursor = 'move'
      transition('EDITING_ENTER')
    } else {
      el.style.cursor = 'auto'
      transition('EDITING_EXIT')
    }
  }, [dragTarget])

  return null
})

module.exports = SelectionManager
