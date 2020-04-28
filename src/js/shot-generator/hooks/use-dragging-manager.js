import * as THREE from 'three'
import React, { useCallback, useRef } from 'react'

const useDraggingManager = (useIcons) => {
    const raycaster = useRef()
    const plane = useRef()
    const intersection = useRef()
    const selectedObjects = useRef()
    const objectChanges = useRef()
    const offsets = useRef()

    const prepareDrag = useCallback((target, { x, y, camera, scene, selections }) => {
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
        if ( target.userData.type === 'attachable' ) { 
          plane.current.setFromNormalAndCoplanarPoint( camera.getWorldDirection( plane.current.normal ), target.worldPosition() )
        } else {
          plane.current.setFromNormalAndCoplanarPoint( camera.getWorldDirection( plane.current.normal ), target.position )
        }
      }
    
      for (let selection of selections) {
        let object = scene.children[0].children.find(child => child.userData.id === selection)
        if(object) {
          selectedObjects.current[selection] = object
        }
      }
      // remember the offsets of every selected object
      if ( raycaster.current.ray.intersectPlane( plane.current, intersection.current ) ) {
        if ( target.userData.type === 'attachable' ) {
          let child = scene.__interaction.find( child => child.userData.id === target.userData.id )
          let vectorPos = child.worldPosition()
          offsets.current[target.userData.id] = new THREE.Vector3().copy( intersection.current ).sub( vectorPos )
          return;
        }
        for (let selection of selections) {
          if(!selectedObjects.current[selection]) continue
          offsets.current[selection] = new THREE.Vector3().copy( intersection.current ).sub( selectedObjects.current[selection].position )
        }
      } else {
        for (let selection of selections) {
          offsets.current[selection] = new THREE.Vector3()
        }
      }
    }, [plane.current, raycaster.current, intersection.current])
    
    const drag = useCallback((mouse, target, camera, selections) => {
      if(!raycaster.current) return
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
          target.updateMatrixWorld(true)
  
          objectChanges.current[target.userData.id] = { x, y, z }
        } else {
          if ( raycaster.current.ray.intersectPlane( plane.current, intersection.current ) ) {
            for (let selection of selections) {
              let target = selectedObjects.current[selection]
              if (!target || target.userData.locked) continue

              let { x, z } = intersection.current.clone().sub( offsets.current[selection] ).setY(0)
              target.position.set( x, target.position.y, z )

              objectChanges.current[selection] = { x, y: z }
            }
          }
        }
      }
    }, [plane.current, raycaster.current, intersection.current])
    
    const updateStore = (updateObjects) => {
        if (!objectChanges.current || !objectChanges.current || !Object.keys(objectChanges.current).length) {
            return false
          }
        updateObjects(objectChanges.current)
    }
    
    const endDrag = useCallback((updateObjects) => {
      if (!objectChanges.current || !objectChanges.current || !Object.keys(objectChanges.current).length) {
        return false
      }
      updateObjects(objectChanges.current)
      objectChanges.current = null
      raycaster.current = null
      plane.current = null
      intersection.current = null
      selectedObjects.current = null
      objectChanges.current = null
      offsets.current = null
    }, [])

    return { prepareDrag, drag, updateStore, endDrag }
}

export { useDraggingManager }
