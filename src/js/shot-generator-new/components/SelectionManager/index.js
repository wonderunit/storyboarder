import React, { useState, useLayoutEffect, useRef, useMemo, useContext, useEffect} from 'react'
import { connect } from 'react-redux'
import '../../../shared/IK/utils/Object3dExtension'
import GPUPicker from '../../../xr/src/three/GPUPickers/GPUPicker'
import SGIkHelper from '../../../shared/IK/SGIkHelper'
import {
  selectObject,
  selectObjectToggle,
  selectBone,
  selectAttachable,
  updateObjects,
  updateObject,
  
  undoGroupStart,
  undoGroupEnd,

  getSelections,
  getActiveCamera,
  deselectAttachable,
  getSceneObjects,
} from '../../../shared/reducers/shot-generator'

import { SceneContext } from "../../Components"

import deepEqualSelector from './../../../utils/deepEqualSelector'
import {getScene} from '../../utils/scene'

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

  if (intersect.object.type === 'Sprite') {
    return intersect.object.parent.linkedTo
  }

  // character
  if (intersect.object.userData.type === 'hitter' ) {
    return intersect.object.parent.object3D
  }

  //Transform control
  if(intersect.object.type === 'gizmo') {
    if(intersect.object.parent.parent.userData.type === "objectControl") {
      return intersect.object.parent.parent.parent
    }
    return intersect.object
  }

  if(intersect.object.userData.type === 'controlPoint' || intersect.object.userData.type === 'objectControl') {
    return intersect.object
  }

  if(intersect.object.type === 'SkinnedMesh' || intersect.object.parent.userData.type === 'object' 
    || intersect.object.userData.type === 'image' || intersect.object.userData.type === 'hitter_light'
    || intersect.object.userData.type === 'attachable' ) {
    return intersect.object.parent
  }
}
const getSceneObjectsM = deepEqualSelector([getSceneObjects], (sceneObjects) => sceneObjects)
const getSelectionsM = deepEqualSelector([getSelections], selections => selections)

const SelectionManager = connect(
  state => ({
    selections: getSelectionsM(state),
    sceneObjects: getSceneObjectsM(state),
    activeCamera: getActiveCamera(state),
  }),
  {
    selectObject,
    selectObjectToggle,
    selectBone,
    updateObject,
    updateObjects,
    selectAttachable,
    deselectAttachable,
    undoGroupStart,
    undoGroupEnd
  }
)(
React.memo(({
    camera,
    el,

    selectOnPointerDown,
    useIcons,

    selections,
    sceneObjects,
    activeCamera,

    selectObject,
    selectObjectToggle,
    selectBone,
    selectAttachable,
    updateObjects,
    gl,
    
    undoGroupStart,
    undoGroupEnd,
    deselectAttachable,
  
    onDrag,
    onDragStart,
    onDragEnd,
  }) => {

  const scene = getScene()
  const [pointerDowned, setPointerDowned] = useState(false)
  const [lastDownId, setLastDownId] = useState()
  const [dragTarget, setDragTarget] = useState()
  const gpuPickerInstance = useRef(null)
  const intersectables = useRef(null)

  const getGPUPicker = () => {
    if(gpuPickerInstance.current === null) {
      gpuPickerInstance.current = new GPUPicker(gl)
    }
    return gpuPickerInstance.current
  }

  const filterIntersectables = () => {
    intersectables.current = scene.children.filter(o => 
        o.userData.type === 'object' ||
        o.userData.type === 'character' ||
        o.userData.type === 'light' ||
        o.userData.type === 'volume' ||
        o.userData.type === 'image' ||
        o.userData.type === 'controlTarget' ||
        o.userData.type === 'controlPoint' ||
        o.userData.type === 'objectControl' ||
        o.userData.type === 'attachable' ||
        (useIcons && o.isPerspectiveCamera)
      )
    for(let i = 0; i < intersectables.current.length; i++) {
      if(intersectables.current[i].userData.type === 'character' && intersectables.current[i].attachables) {
        intersectables.current = intersectables.current.concat(intersectables.current[i].attachables)
      }
    }
  }
  
  const mouse = event => {
    const rect = el.getBoundingClientRect()
    return {
      x: ( ( event.clientX - rect.left ) / rect.width ) * 2 - 1,
      y: - ( ( event.clientY - rect.top ) / rect.height ) * 2 + 1
    }
  }

  const getIntersects = (mousePosition, camera, useIcons, pointer, wall = null) => {
    let raycaster = new THREE.Raycaster()
    let x = mousePosition.x;
    let y = mousePosition.y;
    raycaster.setFromCamera({x, y}, camera )
    let intersects = [];

    if( useIcons) {
      intersects = raycaster.intersectObjects( getObjectsFromIcons(intersectables.current) )
    }
    else {
      x = pointer.x
      y = pointer.y
      raycaster.setFromCamera({x, y}, camera )
      //Check helpers intersection first
      intersects = raycaster.intersectObject(SGIkHelper.getInstance())
      if(intersects.length > 0) {
        return intersects
      }
      x = mousePosition.x
      y = mousePosition.y
      raycaster.setFromCamera({x, y}, camera )
      let gpuPicker = getGPUPicker()
      gpuPicker.setupScene(intersectables.current.filter(object => object.userData.type !== 'volume'))
      gpuPicker.controller.setPickingPosition(mousePosition.x, mousePosition.y)
      intersects = gpuPicker.pickWithCamera(camera, gl, wall)
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
  const selectedObjects = useRef()
  const objectChanges = useRef()
  const offsets = useRef()
  const mousePosition = useRef(new THREE.Vector2());
  const prepareDrag = (target, { x, y, useIcons }) => {
    if (!raycaster.current) raycaster.current = new THREE.Raycaster()
    if (!plane.current) plane.current = new THREE.Plane()
    if (!intersection.current) intersection.current = new THREE.Vector3()

    offsets.current = []
    selectedObjects.current = {}
    objectChanges.current = {}

    raycaster.current.setFromCamera({ x, y }, camera )
    if (useIcons) {
      plane.current.setFromNormalAndCoplanarPoint( camera.position.clone().normalize(), target.position )
    } else {
      plane.current.setFromNormalAndCoplanarPoint( camera.getWorldDirection( plane.current.normal ), target.position )
    }
  
    for (let selection of selections) {
      selectedObjects.current[selection] = scene.children.find(child => child.userData.id === selection)
    }

    // remember the offsets of every selected object
    if ( raycaster.current.ray.intersectPlane( plane.current, intersection.current ) ) {
      // Calculates offset for selected attachable
      // Attachable isn't in selection list cause it moves independently from selected character
      if ( target.userData.type === 'attachable' ) {
        let child = intersectables.current.find( child => child.userData.id === target.userData.id )
        let vectorPos = child.worldPosition()
        offsets.current[target.userData.id] = new THREE.Vector3().copy( intersection.current ).sub( vectorPos )
        return;
      }
      for (let selection of selections) {
        offsets.current[selection] = new THREE.Vector3().copy( intersection.current ).sub( selectedObjects.current[selection].position )
      }
    } else {
      for (let selection of selections) {
        offsets.current[selection] = new THREE.Vector3()
      }
    }
  }
  const drag = (mouse, target) => {
    raycaster.current.setFromCamera( mouse, camera )

    if ( raycaster.current.ray.intersectPlane( plane.current, intersection.current ) ) {
      // Calculates new attachable position
      // Attachable is in no need of switching Y and Z cause they are already in bone space
      // And bone space is in character space which is already got Y and Z switched
      // Also, attachable needs to move up and down while other objects don't
      if(target.userData.type === 'attachable' ) {
        if(target.userData.isRotationEnabled) return
        let { x, y, z } = intersection.current.clone().sub( offsets.current[target.userData.id] )
        let parentMatrixWorld = target.parent.matrixWorld
        let parentInverseMatrixWorld = target.parent.getInverseMatrixWorld()
        target.applyMatrix(parentMatrixWorld)
        target.position.set( x, y, z )
        target.updateMatrixWorld(true)
        target.applyMatrix(parentInverseMatrixWorld)

        objectChanges.current[target.userData.id] = { x, y, z }
      } else {
        for (let selection of selections) {
          let target = selectedObjects.current[selection]
          if (target.userData.locked) continue
          
          let { x, z } = intersection.current.clone().sub( offsets.current[selection] ).setY(0)
          target.position.set( x, target.position.y, z )
          if (target.orthoIcon) {
            target.orthoIcon.position.set( x, target.position.y, z )
          }
          
          objectChanges.current[selection] = { x, y: z }
          if (target.onDrag) {
            target.onDrag()
          }
        }
      }
      if (onDrag) {
        onDrag()
      }
    }
  }
  
  const endDrag = () => {
    onDragEnd && onDragEnd()

    if (!objectChanges || !objectChanges.current || !Object.keys(objectChanges.current).length) {
      return false
    }
    updateObjects(objectChanges.current)
  
    for (let selection of selections) {
      let target = selectedObjects.current[selection]
      if (target && target.onDragEnd) {
        target.onDragEnd()
      }
    }
  
    objectChanges.current = null
  }
  
  useMemo(() => {
    if (dragTarget) {
      let { target, x, y } = dragTarget
      prepareDrag(target, { x, y, useIcons })
    }
  }, [dragTarget])

  const onPointerDown = event => {
    setPointerDowned(true)
    event.preventDefault()
    filterIntersectables()

    // get the mouse coords
    const { x, y } = mouse(event)
    mousePosition.current.set(x, y);
    // find all the objects that intersect the mouse coords
    // (uses a different search method if useIcons is true)
    if(!useIcons) {
      const rect = el.getBoundingClientRect()
      mousePosition.current.set(event.clientX - rect.left, event.clientY - rect.top)
    }
    let intersects = getIntersects(mousePosition.current, camera, useIcons, {x, y})
    // if no objects intersected
    if (intersects.length === 0) {
        if(dragTarget || (selections[0] !== activeCamera) ) {
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
        }
    } else {
      onDragStart && onDragStart()

      let shouldDrag = false
      let target
      let isSelectedControlPoint = false;
      let selectedObjectControl
  
      for (let intersect of intersects) {
        target = getIntersectionTarget(intersect)
        if (target.userData.type === 'character' && target.userData.locked) {
          return
        }
      }

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
      else {
        target = getIntersectionTarget(intersects[0])
        if(!target) return
        if(target.userData && target.userData.type === 'attachable') {
          selectAttachable({id: target.userData.id, bindId: target.userData.bindedId})
          setDragTarget({ target, x, y})
          return 
        } else if(target.userData && target.userData.type === 'controlPoint') {
          let characterId = target.characterId;
          SGIkHelper.getInstance().selectControlPoint(target.uuid, event);
          let characters = intersectables.current.filter(value => value.uuid === characterId);
          target = characters[0];
          isSelectedControlPoint = true;
        } else if(target.userData && target.userData.type === 'objectControl') {
          let characterId = target.characterId
          let targetElement = target.object
          if(targetElement.type === "Bone") {
            let characters = intersectables.current.filter(value => value.uuid === characterId)
            target = characters[0]
            selectedObjectControl = targetElement
          } else if(targetElement.userData.type === "attachable") {
            let characters = intersectables.current.filter(value => value.uuid === characterId)
            target = characters[0]
            selectAttachable({id: targetElement.userData.id, bindId: targetElement.userData.bindedId})
            selectedObjectControl = targetElement
            setDragTarget({ target, x, y, isObjectControl: true })
            return
          }
        } else if(target.type && target.type === 'gizmo') {
          let characterId = target.parent.parent.parent.characterId;
          SGIkHelper.getInstance().selectControlPoint(target.parent.parent.parent.object.uuid, event)
          let characters = intersectables.current.filter(value => value.uuid === characterId)
          target = characters[0];
          isSelectedControlPoint = true;
        }
      }
      deselectAttachable()
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
            if (target.userData.locked) {
              selectObject(null)
              selectBone(null)
              setLastDownId(null)
              setDragTarget(null)
              undoGroupEnd()
              return
            }
            // see if we pointerdown'd a bone ...
            let raycaster = new THREE.Raycaster()
            raycaster.setFromCamera({ x, y }, camera )
            let hits = raycaster.intersectObject(target.bonesHelper)
            if(!isSelectedControlPoint && selectedObjectControl) {
              selectBone(selectedObjectControl.uuid)
              // consider a bone selection the start of a drag
              setDragTarget({ target, x, y, isObjectControl: true })
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
            let object = sceneObjects[target.userData.id]
            if (object && object.group) {
              selectObject([object.group, ...sceneObjects[object.group].children])
            } else {
              selectObject(target.userData.id)
            }
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
      if(dragTarget.target.userData.type === 'character') {
        let ikRig = SGIkHelper.getInstance().ragDoll;
        if(!ikRig || !ikRig.isEnabledIk && !ikRig.hipsMoving && !ikRig.hipsMouseDown) {
          if(!dragTarget.isObjectControl) {
            drag({ x, y }, dragTarget.target)
          }
        }
      }
      else {
        drag({ x, y }, dragTarget.target)
      }

    }
  }

  const onPointerUp = event => {
    if(!pointerDowned) return
    event.preventDefault()

    const { x, y } = mouse(event)
    if (dragTarget) {
      endDrag(dragTarget)
      setDragTarget(null)

      undoGroupEnd()
    }
    SGIkHelper.getInstance().deselectControlPoint(event)
    if (event.target === el) {
      if (!selectOnPointerDown) {
        mousePosition.current.set(x, y)
        if(!useIcons) {
          const rect = el.getBoundingClientRect();
          mousePosition.current.set(event.clientX - rect.left, event.clientY - rect.top)
        }
        let intersects = getIntersects(mousePosition.current, camera, useIcons, { x, y })
        if (intersects.length === 0) {
          setLastDownId(null)
        } else {
          // get the intersection target of the object
          // but ignore gizmo and objectControl intersections
          let target = (
            intersects[0].object.type === 'gizmo' ||
            intersects[0].object.userData.type === 'objectControl'
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
              if (!selections.includes(target.userData.id) && !target.userData.locked) {
                // clear the multi-selection and select just the target
                let object = sceneObjects[target.userData.id]
                if (object && object.group) {
                  selectObject([object.group, ...sceneObjects[object.group].children])
                } else {
                  selectObject(target.userData.id)
                }
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
    window.addEventListener('pointerup', onPointerUp)
    return function cleanup () {
      el.removeEventListener('pointerdown', onPointerDown)
      el.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
    }
  }, [onPointerDown, onPointerUp, onPointerMove])

  useLayoutEffect(() => {
    if (dragTarget) {
      el.style.cursor = 'move'
    } else {
      el.style.cursor = 'auto'
    }
  }, [dragTarget])

  return null
}))

export default SelectionManager
