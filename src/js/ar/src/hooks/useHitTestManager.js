import React, {useEffect, useRef, useCallback} from 'react'
import {useFrame, useThree} from "react-three-fiber"

import store from './../helpers/store'
import {selectObject, updateObject} from "../../../shared/reducers/shot-generator"

import * as BonesHelper from "../../../xr/src/three/BonesHelper"
import * as IKHelper from "../../../shared/IK/IkHelper"

const SCREEN_CENTER = new THREE.Vector2(0.0, 0.0)
const Raycaster = new THREE.Raycaster()

const getObject = (child) => {
  if (child.userData.id) {
    return child
  }

  if (!child.parent) {
    return null
  }

  return getObject(child.parent)
}

const getMainObject = (scene) => {
  return scene.children[0].children[0].children[0]
}

const useDragRef = () => {
  const objectRef = useRef(null)
  const initialMatrix = useRef(new THREE.Matrix4())

  return {
    objectRef, initialMatrix
  }
}

const onDragStart = (camera, target, dragRef) => {
  let inverse = new THREE.Matrix4().getInverse(camera.matrixWorld)

  target.updateWorldMatrix(false, false)
  target.matrixAutoUpdate = false

  dragRef.initialMatrix.current.multiplyMatrices(inverse, target.matrixWorld)
}

const onDrag = (camera, target, dragRef) => {
  target.matrixWorld.multiplyMatrices(camera.matrixWorld, dragRef.initialMatrix.current)
  target.matrix.getInverse(target.parent.matrixWorld).multiply(target.matrixWorld)

  target.matrix.decompose(target.position, target.quaternion, target.scale)
  if (target.userData.type === 'character') {
    target.rotation.set(0, 0, 0)
    target.quaternion.setFromEuler(target.rotation)
  }

  target.updateMatrix()
  target.updateWorldMatrix(false, true)
}

const useHitTestManager = (selectEnabled) => {
  const {scene, camera, gl} = useThree()

  const dragTarget = useDragRef()
  const ikDragTarget = useDragRef()

  const deselect = useCallback(() => {
    if (dragTarget.objectRef.current !== null) {
      dragTarget.objectRef.current = null
      store.dispatch(selectObject(null))
    }
  }, [])

  useEffect(() => {
    const currentIKHelper = IKHelper.getInstance()

    currentIKHelper.setUpdate(
      () => {},
      () => {},
      () => {},
      () => {},
      () => {}
    )
  }, [])

  useEffect(() => {
    if (selectEnabled) {
      Raycaster.setFromCamera( SCREEN_CENTER, camera )

      let intersects = [], intersection = null

      if (BonesHelper.getInstance().isSelected) {
        console.log('IK selection')



        intersects = Raycaster.intersectObjects([IKHelper.getInstance()], true)
        intersection = intersects.find(h => h.isControlTarget)

        if (intersection) {
          console.log('intersected', intersection)

          onDragStart(camera, intersection.object, ikDragTarget)
          if (ikDragTarget.objectRef.current !== intersection.object) {
            ikDragTarget.objectRef.current = intersection.object
            //camera.attach(intersection.object)
            IKHelper.getInstance().selectControlPoint(intersection.object.name)
            //scene.children[0].attach(intersection.object)
          }

          return
        }

        ikDragTarget.objectRef.current = null
      }

      let objects = getMainObject(scene).children.filter((obj) => obj.userData.isSelectable)
      intersects = Raycaster.intersectObjects(objects, true)

      if (intersects.length) {
        const target = getObject(intersects[0].object)

        onDragStart(camera, target, dragTarget)

        if (dragTarget.objectRef.current !== target) {
          dragTarget.objectRef.current = target
          store.dispatch(selectObject(target.userData.id))
        }
      } else {
        deselect()
      }
    } else {
      if (ikDragTarget.objectRef.current) {
        IKHelper.getInstance().deselectControlPoint()
        ikDragTarget.objectRef.current = null

      } else if (dragTarget.objectRef.current) {
        let position = {
          x: dragTarget.objectRef.current.position.x,
          y: dragTarget.objectRef.current.position.z,
          z: dragTarget.objectRef.current.position.y
        }

        let rotation
        switch (dragTarget.objectRef.current.userData.type) {
          case 'character':
            rotation = dragTarget.objectRef.current.rotation.y
            break
          case 'object':
          case 'image':
            rotation = {
              x: dragTarget.objectRef.current.rotation.x,
              y: dragTarget.objectRef.current.rotation.y,
              z: dragTarget.objectRef.current.rotation.z
            }
        }

        store.dispatch(updateObject(dragTarget.objectRef.current.userData.id, {...position, rotation}))
      }
    }
  }, [selectEnabled])


  useFrame(() => {
    if (selectEnabled) {
      if (dragTarget.objectRef.current && !ikDragTarget.objectRef.current) {

        gl.xr.getCamera(camera)
        onDrag(camera, dragTarget.objectRef.current, dragTarget)

      } else if (ikDragTarget.objectRef.current) {

        gl.xr.getCamera(camera)
        onDrag(camera, ikDragTarget.objectRef.current, ikDragTarget)
      }
    }
  })
}

export default useHitTestManager