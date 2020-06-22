import React, {useEffect, useRef} from 'react'
import {useFrame, useThree} from "react-three-fiber"

import store from './../helpers/store'
import {selectObject, updateObject} from "../../../shared/reducers/shot-generator"

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
  return scene.children[0].children[0]
}

const useHitTestManager = (selectEnabled) => {
  const {scene, camera, gl} = useThree()

  const targetRef = useRef(null)
  const initialMatrix = useRef(new THREE.Matrix4())

  useEffect(() => {
    if (selectEnabled) {
      Raycaster.setFromCamera( SCREEN_CENTER, camera )

      let objects = getMainObject(scene).children.filter((obj) => obj.userData.isSelectable)
      let intersects = Raycaster.intersectObjects( objects, true )

      if (intersects.length) {
        const target = getObject(intersects[0].object)
        if (targetRef.current !== target) {
          targetRef.current = target

          gl.xr.getCamera(camera)
          camera.attach(target)

          store.dispatch(selectObject(target.userData.id))
        }
      } else {
        if (targetRef.current !== null) {
          targetRef.current = null
          store.dispatch(selectObject(null))
        }
      }
    } else {
      if (targetRef.current) {
        getMainObject(scene).attach(targetRef.current)
        //store.dispatch(updateObject(targetRef.current.userData.id, {}))
      }
    }
  }, [selectEnabled])


  useFrame(() => {
    if (selectEnabled && targetRef.current) {
      targetRef.current.updateMatrixWorld(true)
    }
  })
}

export default useHitTestManager