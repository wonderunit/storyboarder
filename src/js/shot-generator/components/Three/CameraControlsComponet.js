import { connect } from 'react-redux'
import React, { useRef, useEffect } from 'react'
import { useThree, useFrame } from 'react-three-fiber'
import * as THREE from 'three'
import { 
    updateObject,
    
    undoGroupStart,
    undoGroupEnd,
  
    getSelections,
} from '../../../shared/reducers/shot-generator'
import isUserModel from '../../helpers/isUserModel'
import CameraControls from '../../CameraControls'

const CameraControlComponent = connect(
    state => ({
        selections: getSelections(state)
    }),
    {
        updateObject,
        withState: (fn) => (dispatch, getState) => fn(dispatch, getState())
    }
)(React.memo(({
    activeCamera,
    pointerDownEvent,
    pointerUpEvent,
    activeGL,
    isCameraControlsEnabled,
    takeSceneObjects,

    updateObject,
    selections,
    withState
}) => { 

    const { scene, camera } = useThree()
    const cameraControlsView = useRef()

    const setCameraControlTarget = (selections) => {
        if(selections.length === 1 && selections[0] === activeCamera) return
        let selectedObjects = scene.__interaction.filter(object => object.userData.type !== 'camera' && object.userData.type !== 'volume' 
                                                          && selections.includes(object.userData.id) )
        if(!selectedObjects.length) {
          cameraControlsView.current.Target = null
          return
        }
        let target = new THREE.Vector3()
        for(let i = 0; i < selectedObjects.length; i++) {
          let selectedObject = selectedObjects[i]
          if(selectedObject.userData.type === "character") {
            if(!isUserModel(selectedObject.userData.model)) {
              let skinnedMesh = selectedObject.getObjectByProperty("type", "SkinnedMesh")
              let bone = skinnedMesh.skeleton.getBoneByName("Head")
              target.add(bone.worldPosition())
            } else {
              let position = selectedObjects[i].worldPosition()
              position.y = camera.position.y
              target.add(position)
            }
          } else {
            target.add(selectedObjects[i].worldPosition())
          }
        }
        target.divideScalar(selectedObjects.length)
        cameraControlsView.current.Target = target
    }

    const onCameraUpdate = ({active, object}) => {
        if (camera.userData.locked) {
          return false
        }

        if (!active) {
          updateObject(camera.userData.id, {
            x: object.x,
            y: object.y,
            z: object.z,
            rotation: object.rotation,
            tilt: object.tilt,
            roll: object.roll,
            fov: object.fov
          })
        } else {
          camera.position.x = object.x
          camera.position.y = object.z
          camera.position.z = object.y
          camera.rotation.x = 0
          camera.rotation.z = 0
          camera.rotation.y = object.rotation
          camera.rotateX(object.tilt)
          camera.rotateZ(object.roll)
          camera.fov = object.fov
          camera.updateProjectionMatrix()
          camera.isSynchronized = false
        }
    }

    useEffect(() => {
        if(!activeCamera) return
        if(cameraControlsView.current) {
          let sceneObjects = takeSceneObjects()
          cameraControlsView.current.object = CameraControls.objectFromCameraState(sceneObjects[activeCamera])
          return 
        }
        let sceneObjects = takeSceneObjects()
  
        cameraControlsView.current = new CameraControls(
          CameraControls.objectFromCameraState(sceneObjects[activeCamera]),
          activeGL.domElement,
          {
            undoGroupStart,
            undoGroupEnd,
            onChange: onCameraUpdate
          }
        )
        cameraControlsView.current.camera = camera
    }, [activeCamera])

    useEffect(() => {
        if(!pointerDownEvent) return
        let sceneObjects = takeSceneObjects()
        cameraControlsView.current.object = CameraControls.objectFromCameraState(sceneObjects[activeCamera])
        cameraControlsView.current.onPointerDown(pointerDownEvent)
    }, [pointerDownEvent])

    useEffect(() => {
        if(!pointerUpEvent) return
        cameraControlsView.current.onPointerUp(pointerUpEvent)
    }, [pointerUpEvent])

    useEffect(() => {
        if(!cameraControlsView.current) return
        cameraControlsView.current.reset()
        cameraControlsView.current.enabled = isCameraControlsEnabled
    }, [isCameraControlsEnabled])

    useEffect(() => {
        if(!cameraControlsView.current) return
        cameraControlsView.current.dispose()
        cameraControlsView.current.domElement = activeGL.domElement
        cameraControlsView.current.intializeEvents()
    }, [activeGL])

    useEffect(() => {
        setCameraControlTarget(selections)
    }, [selections])

    useFrame((state, delta) => {
        if(cameraControlsView.current) {
         
          withState((dispatch, state) => {
            cameraControlsView.current.update(delta, state)
          })
        }
    }, 0)

    return false
}))

export default CameraControlComponent
