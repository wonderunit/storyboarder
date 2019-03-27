const { useState, useEffect, useLayoutEffect, useRef } = React = require('react')
const { connect } = require('react-redux')

const {
  selectObject,
  selectObjectToggle,
  selectBone,
  updateObject
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
    // console.log('found', o.userData)

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

    // if (o.userData.type === 'volume') {
    // }

    // TODO allow camera selection
    // if (o.userData.type === 'camera') {
    // }
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
    selections: state.selections,
    sceneObjects: state.sceneObjects
  }),
  {
    selectObject,
    selectObjectToggle,
    selectBone,
    updateObject
  }
)(
  ({
    scene,
    camera,
    el,

    selectOnPointerDown,
    useIcons,

    selections,
    sceneObjects,

    selectObject,
    selectObjectToggle,
    selectBone,
    updateObject,

    transition
  }) => {

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

  const getIntersects = ({ x, y }, camera) => {
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

    console.log('PREPARE DRAG', { x, y, useIcons })

    raycaster.current.setFromCamera({ x, y }, camera )

    if (useIcons) {
      plane.current.setFromNormalAndCoplanarPoint( camera.position.clone().normalize(), target.position )
    } else {
      plane.current.setFromNormalAndCoplanarPoint( camera.getWorldDirection( plane.current.normal ), target.position )
    }

    console.log('plane normal', plane.current.normal)

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

    console.log('offsets', offsets.current)
  }
  const drag = (target, mouse) => {
    console.log('drag')
    raycaster.current.setFromCamera( mouse, camera )
    
    if ( raycaster.current.ray.intersectPlane( plane.current, intersection.current ) ) {
      for (selection of selections) {
        let { x, z } = intersection.current.sub( offsets.current[selection] ).setY(0)
        updateObject(selection, { x, y: z })
      }
    }
  }
  const endDrag = () => {
    
  }

  const onPointerDown = event => {
    event.preventDefault()

    transition('TYPING_EXIT')

    const { x, y } = mouse(event)

    let intersects = getIntersects({ x, y }, camera)

    if (intersects.length === 0) {
      endDrag()
      setDragTarget(null)

      setLastDownId(null)
      selectObject(undefined)
      selectObject(camera.userData.id)
      selectBone(null)

    } else {
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
          // if there already is a character selected
          if (target.userData.type === 'character' && selections.includes(target.userData.id)) {
            let raycaster = new THREE.Raycaster()
            raycaster.setFromCamera({ x, y }, camera )
            let hits = raycaster.intersectObject(target.bonesHelper)

            // select a bone
            if (hits.length) {
              selectObject(target.userData.id)
              setLastDownId(null)

              selectBone(hits[0].bone.uuid)

              prepareDrag(target, { x, y, useIcons })
              setDragTarget(target)
              return
            }
          }
        }

        prepareDrag(target, { x, y, useIcons })
        setDragTarget(target)
      }

      selectBone(null)

      if (selectOnPointerDown) {
        event.shiftKey
          ? selectObjectToggle(target.userData.id)
          : selectObject(target.userData.id)
      } else {
        setLastDownId(target.userData.id)
      }
    }
  }

  const onPointerMove = event => {
    event.preventDefault()

    const { x, y } = mouse(event)

    if (dragTarget) {
      drag(dragTarget, { x, y })
    }
  }

  const onPointerUp = event => {
    event.preventDefault()

    const { x, y } = mouse(event)

    if (dragTarget) {
      endDrag()
      setDragTarget(null)
    }

    if (event.target === el) {
      if (!selectOnPointerDown) {
        let intersects = getIntersects({ x, y }, camera)

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
              selectObjectToggle(target.userData.id)
            } else {

              // FIXME should not de-select multi-selection after dragging

              selectObject(target.userData.id)
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
