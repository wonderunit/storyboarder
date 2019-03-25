const { useState, useEffect } = React = require('react')
const { connect } = require('react-redux')

const {
  selectObject,
  selectObjectToggle
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
          .map(o => o.children[0])
      )
}

function getObjectsFromCameraView (objects) {
  let results = []

  for (let o of objects) {
    // console.log('found', o.userData)

    if (o.userData.type === 'object') {
      if (o.type === 'Group' && o.children[0].isMesh) {
        results.push(o.children[0])
      }
    }

    if (o.userData.type === 'character') {
      // if the mesh has loaded
      if (o.bonesHelper) {
        results = results.concat(o.bonesHelper.hit_meshes)
      }
    }

    if (o.userData.type === 'light') {
      results.push(o.hitter)
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
    selectObjectToggle
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
    selectObjectToggle
  }) => {

  const [lastDownId, setLastDownId] = useState()

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

  const onPointerDown = event => {
    event.preventDefault()

    let intersects = getIntersects(mouse(event), camera)

    if (intersects.length === 0) {
      setLastDownId(undefined)

      if (selectOnPointerDown) {
        selectObject(undefined)
      }
      return
    }

    // TODO use closest-to-camera of targets
    let intersect = intersects[0]
    let target = getIntersectionTarget(intersect)

    if (selectOnPointerDown) {
      event.shiftKey
        ? selectObjectToggle(target.userData.id)
        : selectObject(target.userData.id)
    } else {
      setLastDownId(target.userData.id)
    }
  }

  const onPointerUp = event => {
    event.preventDefault()

    if (event.target === el) {
      if (!selectOnPointerDown) {
        let intersects = getIntersects(mouse(event), camera)

        if (intersects.length === 0) {
          selectObject(undefined)
          return
        }

        // TODO use closest-to-camera of targets
        let intersect = intersects[0]
        let target = getIntersectionTarget(intersect)

        if (target.userData.id === lastDownId) {
          event.shiftKey
            ? selectObjectToggle(target.userData.id)
            : selectObject(target.userData.id)
        }
      }
    }

    setLastDownId(undefined)
  }

  useEffect(() => {
    el.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('pointerup', onPointerUp)

    return function cleanup () {
      el.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('pointerup', onPointerUp)
    }
  }, [onPointerDown, onPointerUp])

  return null
})

module.exports = SelectionManager
