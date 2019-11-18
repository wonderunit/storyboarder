const { useState, useLayoutEffect, useRef, useMemo, useContext } = React = require('react')
const { connect } = require('react-redux')
require("../shared/IK/utils/Object3dExtension");
const GPUPicker = require("../xr/src/three/GPUPickers/GPUPicker");
const SGIkHelper = require("../shared/IK/SGIkHelper");
const {
  selectObject,
  selectObjectToggle,
  selectBone,
  updateObjects,
  updateObject,

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

const getIntersectionTarget = intersect => {

  if(intersect.object.userData.type === 'accessory'){
    return intersect.object.parent
  }

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

  //Transform control
  if(intersect.object.type === 'gizmo')
  {
    if(intersect.object.parent.parent.userData.type === "boneControl")
    {
      return intersect.object.parent.parent.parent;
    }
    return intersect.object;
  }

  if(intersect.object.type === 'SkinnedMesh')
  {
    return intersect.object.parent;
  }

  if(intersect.object.userData.type === 'controlPoint')
  {
    return intersect.object;
  }

  if(intersect.object.userData.type === 'boneControl')
  {
    return intersect.object;
  }

  // object
  if (intersect.object.parent.userData.type === 'object') {
    return intersect.object.parent
  }

  // image
  if (intersect.object.userData.type === 'image') {
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
    gl,
    updateObject,
    
    undoGroupStart,
    undoGroupEnd
  }) => {

  const { scene } = useContext(SceneContext)

  const [lastDownId, setLastDownId] = useState()
  const [dragTarget, setDragTarget] = useState()
  const gpuPickerInstance = useRef(null);

  const getGPUPicker = () => {
    if(gpuPickerInstance.current === null)
    {
      gpuPickerInstance.current = new GPUPicker(gl);
    }
    return gpuPickerInstance.current;
  };


  let intersectables = scene.children.filter(o =>
    o.userData.type === 'object' ||
    o.userData.type === 'character' ||
    o.userData.type === 'light' ||
    o.userData.type === 'volume' ||
    o.userData.type === 'image' ||
    o.userData.type === 'controlTarget' ||
    o.userData.type === 'controlPoint' ||
    o.userData.type === 'boneControl' ||
    o.userData.type === 'accessory' ||
    (useIcons && o.isPerspectiveCamera)
  )
  for(let i = 0; i < intersectables.length; i++) {
    if(intersectables[i].userData.type === 'character' && intersectables[i].accessories) {
      intersectables = intersectables.concat(intersectables[i].accessories)
    }
  }
  const mouse = event => {
    const rect = el.getBoundingClientRect()
    return {
      x: ( ( event.clientX - rect.left ) / rect.width ) * 2 - 1,
      y: - ( ( event.clientY - rect.top ) / rect.height ) * 2 + 1
    }
  }

  const getIntersects = (mousePosition, camera, useIcons, pointer) => {
    let raycaster = new THREE.Raycaster()
    let x = mousePosition.x;
    let y = mousePosition.y;
    raycaster.setFromCamera({x, y}, camera )
    let intersects = [];

    if( useIcons)
    {
      intersects = raycaster.intersectObjects( getObjectsFromIcons(intersectables) )
    }
    else
    {
      x = pointer.x;
      y = pointer.y;
      raycaster.setFromCamera({x, y}, camera )
      //Check helpers intersection first 
      intersects = raycaster.intersectObject(SGIkHelper.getInstance())
      if(intersects.length > 0)
      {
        return intersects
      }
      x = mousePosition.x;
      y = mousePosition.y;
      raycaster.setFromCamera({x, y}, camera )
      let gpuPicker = getGPUPicker()
      gpuPicker.setupScene(intersectables.filter(object => object.userData.type !== 'volume'))
      gpuPicker.controller.setPickingPosition(mousePosition.x, mousePosition.y)
      intersects = gpuPicker.pickWithCamera(camera, gl)
     // console.log(intersects)
    }
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
  const mousePosition = useRef(new THREE.Vector2());
  const prepareDrag = (target, { x, y, useIcons }) => {
    if (!raycaster.current) raycaster.current = new THREE.Raycaster()
    if (!plane.current) plane.current = new THREE.Plane()
    if (!intersection.current) intersection.current = new THREE.Vector3()

    offsets.current = []

    raycaster.current.setFromCamera({ x, y }, camera )
    if (useIcons) {
      plane.current.setFromNormalAndCoplanarPoint( camera.position.clone().normalize(), target.position )
    } else {
      plane.current.setFromNormalAndCoplanarPoint( camera.getWorldDirection( plane.current.normal ), target.position)
    }

    // remember the offsets of every selected object
    if ( raycaster.current.ray.intersectPlane( plane.current, intersection.current ) ) {
      if(target.userData.type === 'accessory' ) {
        let child = intersectables.find(child => child.userData.id === target.userData.id)
        let vectorPos = child.position.clone()
       offsets.current[target.userData.id] = new THREE.Vector3().copy( intersection.current ).sub( vectorPos )
      }
      for (let selection of selections) {
        let child = intersectables.find(child => child.userData.id === selection)
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
      if(target.userData.type === 'accessory' ) {

        let { x, y, z } = intersection.current.clone().sub( offsets.current[target.userData.id] )
        let vector = new THREE.Vector3(x, y, z)
        changes[target.userData.id] = { x: vector.x, y: vector.y, z: vector.z  }
      } else {
        for (selection of selections) {
        let { x, z } = intersection.current.clone().sub( offsets.current[selection] )
        changes[selection] = { x, y: z }
       }
      }
      updateObjects(changes)
    }
  }
  const endDrag = (dragTarget) => {
    if(dragTarget && dragTarget.target.userData.type === 'accessory')
      updateObject(dragTarget.target.userData.id, {isAccessorySelected: false})
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
    mousePosition.current.set(x, y);
    //console.log(intersectables)
    // find all the objects that intersect the mouse coords
    // (uses a different search method if useIcons is true)
    if(!useIcons)
    {
      const rect = el.getBoundingClientRect();
      mousePosition.current.set(event.clientX - rect.left, event.clientY - rect.top);
    }
    let intersects = getIntersects(mousePosition.current, camera, useIcons, {x, y});
    //console.log(intersects)
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
      let isSelectedControlPoint = false;
      let selectedBoneControl;

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
      
      } 
      else 
      {
        let controlPoint = intersects.filter((intersect) => intersect.object.name === 'controlPoint' || intersect.object.type === "gizmo");
        if(controlPoint.length !== 0)
        {
          intersects[0] = controlPoint[0];
        }
        target = getIntersectionTarget(intersects[0])
        if(target.userData && target.userData.type === 'accessory') {
          updateObject(target.userData.id, {isAccessorySelected: true})
          selectObject(target.userData.bindedId)
          setDragTarget({ target, x, y})
          return 
        }
        if(intersects[0].object && intersects[0].object.userData && intersects[0].object.userData.type === 'controlPoint') {
          let characterId = target.characterId;
          SGIkHelper.getInstance().selectControlPoint(target.uuid, event);
          let characters = intersectables.filter(value => value.uuid === characterId);
          target = characters[0];
          isSelectedControlPoint = true;
  
        } 
        else if(target && target.userData && target.userData.type === 'boneControl') {
          let characterId = target.characterId;
          let boneId = target.boneId;
          let characters = intersectables.filter(value => value.uuid === characterId);
          target = characters[0];
          let bone = target.children.filter(child => child.type === "SkinnedMesh")[0].skeleton.bones.filter(value => value.uuid === boneId);
          selectedBoneControl = bone[0];
        }
        else if(intersects[0].object && intersects[0].object.type && intersects[0].object.type === 'gizmo') {
          let characterId = target.parent.parent.parent.characterId;
          SGIkHelper.getInstance().selectControlPoint(target.parent.parent.parent.object.uuid, event);
          let characters = intersectables.filter(value => value.uuid === characterId);
          target = characters[0];
          isSelectedControlPoint = true;
        }
      }
      // if there are 1 or more selections
      if (selections.length) {
        // and we're not in icon mode
        if (!useIcons) {
          // if only one character is selected ...
          if ( target.userData.type === 'character' &&
              selections.length === 1 &&
              //  and its the one we pointerdown'd ...
              selections[0] === target.userData.id
            ) {
            // see if we pointerdown'd a bone ...
            let raycaster = new THREE.Raycaster()
            raycaster.setFromCamera({ x, y }, camera )
            let hits = raycaster.intersectObject(target.bonesHelper)
            if(!isSelectedControlPoint && selectedBoneControl)
            {
              selectBone(selectedBoneControl.uuid)
              // consider a bone selection the start of a drag
              setDragTarget({ target, x, y, isBoneControl: true })
              return
            }

            // select the bone
            if (!isSelectedControlPoint && hits.length) {
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

    if (dragTarget)
    {
      if(dragTarget.target.userData.type === 'character')
      {
        let ikRig = SGIkHelper.getInstance().ragDoll;
        if(!ikRig || !ikRig.isEnabledIk && !ikRig.hipsMoving && !ikRig.hipsMouseDown)
        {
          if(!dragTarget.isBoneControl)
          {
            drag(dragTarget.target, { x, y })
          }
        }

      }
      else {
        drag(dragTarget.target, { x, y })
      }

    }
  }

  const onPointerUp = event => {
    event.preventDefault()

    const { x, y } = mouse(event)

    if (dragTarget) {
      endDrag(dragTarget)
      setDragTarget(null)

      undoGroupEnd()
    }
    SGIkHelper.getInstance().deselectControlPoint(event);
    if (event.target === el) {
      if (!selectOnPointerDown) {
        mousePosition.current.set(x, y);
        if(!useIcons)
        {
          const rect = el.getBoundingClientRect();
          mousePosition.current.set(event.clientX - rect.left, event.clientY - rect.top);
        }
        let intersects = getIntersects(mousePosition.current, camera, useIcons, { x, y })
        if (intersects.length === 0) {
          // selectObject(undefined)
          // selectBone(null)
          setLastDownId(null)
          // 
          // endDrag()
          // setDragTarget(null)

        } else {
          // get the intersection target of the object
          // but ignore gizmo and boneControl intersections
          let target = (
            intersects[0].object.type === 'gizmo' ||
            intersects[0].object.userData.type === 'boneControl'
          )
          ? null
          : getIntersectionTarget(intersects[0])
          if (target && target.userData.id == lastDownId) {
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
