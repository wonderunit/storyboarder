import { connect } from 'react-redux'
import React, { useRef, useCallback, useLayoutEffect, useState, useMemo, useEffect } from 'react'
import { useThree, useUpdate, useFrame } from 'react-three-fiber'
import * as THREE from 'three'
import { useDraggingManager } from '../../use-dragging-manager'
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
import deepEqualSelector from './../../../utils/deepEqualSelector'
import BonesHelper from '../../../xr/src/three/BonesHelper'
import CameraControls from '../../CameraControls'
import { computeSphere } from 'three-bmfont-text/lib/utils'

const getIntersectionTarget = intersect => {
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

  if(intersect.object.type === 'SkinnedMesh') {
    return intersect.object.parent.parent
  }

  if(intersect.object.parent.userData.type === 'object' || intersect.object.userData.type === 'attachable'
    || intersect.object.userData.type === 'image' || intersect.object.userData.type === 'light') {
    return intersect.object.parent
  }
}

const sceneObjectSelector = (state) => {
    const sceneObjects = getSceneObjects(state)
    return Object.values(sceneObjects).map((object) => {
      return {
        id:           object.id,
        group:        object.group || null,
        children:     object.children || null,
      }
    })
  }
const getSceneObjectsM = deepEqualSelector([getSceneObjects], (sceneObjects) => sceneObjects)
const getSelectionsM = deepEqualSelector([getSelections], selections => selections)
const InteractionManager = connect(
    state => ({
        selections: getSelectionsM(state),
        sceneObjects: getSceneObjectsM(state),
        activeCamera: getActiveCamera(state)
    }),
    {
        selectObject,
        selectObjectToggle,
        selectBone,
        updateObjects,
        updateObject,
        selectAttachable,
        deselectAttachable,
        undoGroupStart,
        undoGroupEnd,
        withState: (fn) => (dispatch, getState) => fn(dispatch, getState())
    }
)(React.memo(({
    sceneObjects,
    selections,
    activeCamera,
    selectObject,
    selectObjectToggle,
    selectBone,

    updateObjects,
    updateObject,
    selectAttachable,
    deselectAttachable,

    undoGroupStart,
    undoGroupEnd,
    withState
}) => {
    const { scene, gl, camera } = useThree()
    const intersectables = useRef()
    const [lastDownId, setLastDownId] = useState()
    const [dragTarget, setDragTarget] = useState()
    const { prepareDrag, drag, updateStore, endDrag } = useDraggingManager(false)
    const gpuPickerInstance = useRef(null)
    const raycaster = useRef(new THREE.Raycaster())
    const mousePosition = useRef(new THREE.Vector2())
    const cameraControlsView = useRef()
    
    const onCameraUpdate = ({active, object}) => {
      if (camera.userData.locked) {
        return false
      }
      
      updateObject(camera.userData.id, {
        x: object.x,
        y: object.y,
        z: object.z,
        rotation: object.rotation,
        tilt: object.tilt,
        fov: object.fov
      })
    }

    useEffect(() => {
      if(!activeCamera || cameraControlsView.current ) return
      cameraControlsView.current = new CameraControls(
        CameraControls.objectFromCameraState(sceneObjects[activeCamera]),
        gl.domElement,
        {
          undoGroupStart,
          undoGroupEnd,
          onChange: onCameraUpdate
        }
      )
    }, [activeCamera])

    const getGPUPicker = useCallback(() => {
        if(gpuPickerInstance.current === null) {
          gpuPickerInstance.current = new GPUPicker(gl)
        }
        return gpuPickerInstance.current
    }, [])

    const enableCameraControls = (state) => {
      cameraControlsView.current.reset()
      cameraControlsView.current.enabled = state
    }
    
    const filterIntersectables = () => {
        intersectables.current = scene.__interaction
        intersectables.current = intersectables.current.concat(scene.children[0].children.filter(o => 
            o.userData.type === 'controlTarget' ||
            o.userData.type === 'controlPoint' ||
            o.userData.type === 'objectControl' ))
    }
    
    const mouse = event => {
        const rect = gl.domElement.getBoundingClientRect()
        return {
          x: ( ( event.clientX - rect.left ) / rect.width ) * 2 - 1,
          y: - ( ( event.clientY - rect.top ) / rect.height ) * 2 + 1
        }
    }

    const getIntersects = (pointer) => {
        let x = pointer.x
        let y = pointer.y
        raycaster.current.setFromCamera({ x, y }, camera )
        //Check helpers intersection first
        let intersects = raycaster.current.intersectObject(SGIkHelper.getInstance())
        if(intersects.length > 0) {
          return intersects
        }
        x = mousePosition.current.x
        y = mousePosition.current.y
        raycaster.current.setFromCamera({ x, y }, camera )
        let gpuPicker = getGPUPicker()
        gpuPicker.setupScene(intersectables.current.filter(object => object.userData.type !== 'volume'))
        gpuPicker.controller.setPickingPosition(mousePosition.current.x, mousePosition.current.y)
        intersects = gpuPicker.pickWithCamera(camera, gl)
        return intersects
    }  

    useMemo(() => {
        if(dragTarget){
            let { target, x, y } = dragTarget
            prepareDrag( target, { x, y, useIcons:true, camera, scene, selections })
            enableCameraControls(false)
        }
    }, [dragTarget])

    const onPointerDown = event => {
        event.preventDefault()
        filterIntersectables()
        cameraControlsView.current.object = CameraControls.objectFromCameraState(sceneObjects[activeCamera])
        // get the mouse coords
        const { x, y } = mouse(event)
        const rect = gl.domElement.getBoundingClientRect()
        mousePosition.current.set(event.clientX - rect.left, event.clientY - rect.top)
        let intersects = getIntersects({ x, y })
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
    
            let shouldDrag = false
            let target
            let isSelectedControlPoint = false
            let selectedObjectControl
            
            for (let intersect of intersects) {
                target = getIntersectionTarget(intersect)
                if (target.userData.type === 'character' && target.userData.locked) {
                return
                }
            }

            target = getIntersectionTarget(intersects[0])
            if(!target) return
            if(target.userData && target.userData.type === 'attachable') {
                selectAttachable({ id: target.userData.id, bindId: target.userData.bindedId })
                setDragTarget({ target, x, y })
                return 
            } else if(target.userData && target.userData.type === 'controlPoint') {
                let characterId = target.characterId
                SGIkHelper.getInstance().selectControlPoint(target.uuid, event)
                let characters = intersectables.current.filter(value => value.uuid === characterId)
                target = characters[0]
                isSelectedControlPoint = true
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
                let characterId = target.parent.parent.parent.characterId
                SGIkHelper.getInstance().selectControlPoint(target.parent.parent.parent.object.uuid, event)
                let characters = intersectables.current.filter(value => value.uuid === characterId)
                target = characters[0]
                isSelectedControlPoint = true;
            }
            deselectAttachable()
            // if there are 1 or more selections
            if (selections.length) {
              // and we're not in icon mode
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
                   // let raycaster = new THREE.Raycaster()
                    if(!isSelectedControlPoint && selectedObjectControl) {
                      selectBone(selectedObjectControl.uuid)
                      // consider a bone selection the start of a drag
                      setDragTarget({ target, x, y, isObjectControl: true })
                      return
                    }
                
                    raycaster.current.setFromCamera({ x, y }, camera )
                    let hits = raycaster.current.intersectObject(BonesHelper.getInstance())
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
            
              if (
                // additional click is on an existing selected object
                selections.includes(target.userData.id)
              ) {
                shouldDrag = true
              }
            }
              selectBone(null)
              setLastDownId(target.userData.id)
            
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
                drag({ x, y }, dragTarget.target, camera, selections)
                updateStore(updateObjects)
              }
            }
          }
          else {
            drag({ x, y }, dragTarget.target, camera, selections)
            updateStore(updateObjects)
          }
        }
    }
    
    const onPointerUp = event => {
        event.preventDefault()
        const { x, y } = mouse(event)
        if (dragTarget) {
          endDrag(updateObjects)
          setDragTarget(null)
    
          undoGroupEnd()
        }
        enableCameraControls(true)
        SGIkHelper.getInstance().deselectControlPoint(event)
        if (event.target === gl.domElement) {
            const rect = gl.domElement.getBoundingClientRect();
            mousePosition.current.set(event.clientX - rect.left, event.clientY - rect.top)
            let intersects = getIntersects({ x, y })
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
    
        setLastDownId(null)
    }

    useFrame((state, delta) => {
      if(cameraControlsView.current) {
       
        withState((dispatch, state) => {
          cameraControlsView.current.object = CameraControls.objectFromCameraState(sceneObjects[activeCamera])
          cameraControlsView.current.update(delta, state)
        })
      }
    }, 0)
    
    useLayoutEffect(() => {
      gl.domElement.addEventListener('pointerdown', onPointerDown)
      gl.domElement.addEventListener('pointermove', onPointerMove)
      gl.domElement.addEventListener('pointerup', onPointerUp)
      return function cleanup () {
        gl.domElement.removeEventListener('pointerdown', onPointerDown)
        gl.domElement.removeEventListener('pointermove', onPointerMove)
        gl.domElement.removeEventListener('pointerup', onPointerUp)
      }
    }, [onPointerDown, onPointerUp, onPointerMove, sceneObjects])
    return null 
}))

export default InteractionManager
