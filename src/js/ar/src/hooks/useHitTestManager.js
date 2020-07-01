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
  return scene.children[0].children[0].children[0]
}

const useHitTestManager = (selectEnabled) => {
  const {scene, camera, gl} = useThree()

  const targetRef = useRef(null)
  const initialMatrix = useRef(new THREE.Matrix4())
  const quaternion = useRef(new THREE.Quaternion())

  useEffect(() => {
    if (selectEnabled) {
      Raycaster.setFromCamera( SCREEN_CENTER, camera )

      let objects = getMainObject(scene).children.filter((obj) => obj.userData.isSelectable)
      let intersects = Raycaster.intersectObjects( objects, true )

      if (intersects.length) {
        const target = getObject(intersects[0].object)

        let inverse = new THREE.Matrix4().getInverse(camera.matrixWorld)

        target.updateWorldMatrix( false, false )
        target.matrixAutoUpdate = false

        initialMatrix.current.multiplyMatrices(inverse, target.matrixWorld)

        if (targetRef.current !== target) {
          targetRef.current = target
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
        let position = {
          x: targetRef.current.position.x,
          y: targetRef.current.position.z,
          z: targetRef.current.position.y
        }

        let rotation
        switch (targetRef.current.userData.type) {
          case 'character':
            rotation = targetRef.current.rotation.y
            break
          case 'object':
          case 'image':
            rotation = {
              x: targetRef.current.rotation.x,
              y: targetRef.current.rotation.y,
              z: targetRef.current.rotation.z
            }
        }

        store.dispatch(updateObject(targetRef.current.userData.id, {...position, rotation}))
      }
    }
  }, [selectEnabled])


  useFrame(() => {
    if (selectEnabled && targetRef.current) {
      gl.xr.getCamera(camera)
      targetRef.current.matrixWorld.multiplyMatrices(camera.matrixWorld, initialMatrix.current)
      targetRef.current.matrix.getInverse(targetRef.current.parent.matrixWorld).multiply(targetRef.current.matrixWorld)

      if (targetRef.current.userData.type === 'character') {
        targetRef.current.matrix.decompose(targetRef.current.position, quaternion.current, targetRef.current.scale)
      } else {
        targetRef.current.matrix.decompose(targetRef.current.position, targetRef.current.quaternion, targetRef.current.scale)
      }

      targetRef.current.updateMatrix()
      targetRef.current.updateMatrixWorld(true)
    }
  })
}

export default useHitTestManager