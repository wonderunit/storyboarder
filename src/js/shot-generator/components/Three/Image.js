import * as THREE from 'three'
import React, { useEffect, useMemo, useRef, useLayoutEffect } from 'react'
import { extend, useThree } from 'react-three-fiber'
import { useAsset } from '../../hooks/use-assets-manager'
import path from 'path'
import fs from 'fs-extra'
import { SHOT_LAYERS } from '../../utils/ShotLayers'
import RoundedBoxGeometryCreator from './../../../vendor/three-rounded-box'
import { axis } from "../../../shared/IK/utils/TransformControls"
import DrawingTexture from "./Helpers/drawing-on-texture" 
import KeyCommandsSingleton from '../KeyHandler/KeyCommandsSingleton'
import createRoundedPlane from './Helpers/create-rounded-plane'
const RoundedBoxGeometry = RoundedBoxGeometryCreator(THREE)

extend({RoundedBoxGeometry})
const mouse = (event, gl) => {
  const rect = gl.domElement.getBoundingClientRect();
  let worldX = ( ( event.clientX - rect.left ) / rect.width ) * 2 - 1;
  let worldY = - ( ( event.clientY - rect.top ) / rect.height ) * 2 + 1;
  return { x: worldX, y: worldY }
}

let saveDataURLtoFile = (dataURL, filename, boardPath) => {
  let imageData = dataURL.replace(/^data:image\/\w+;base64,/, '')
  //let imageFilePath = path.join(path.dirname(boardPath), 'models/images', filename)
  let imageFilePath = path.join(path.dirname(boardPath), 'models/images', `temp_${filename}`)
  fs.writeFileSync(imageFilePath, imageData, 'base64')
}

const Image = React.memo(({ sceneObject, isSelected, imagesPaths, ...props }) => {
  const {asset: texture} = useAsset(imagesPaths[0] || null)
  const { gl, camera } = useThree()
  const aspect = useRef(1)
  const ref = useRef()
  const drawingTexture = useRef(new DrawingTexture())
  const isDrawingMode = useRef(false)
  const material = useMemo(() => {
    let material = drawingTexture.current.createMaterial()
    return material
  }, [])

  useMemo(() => {
    if(!texture) return
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping
    texture.offset.set(0, 0)
    texture.repeat.set(1, 1)

    const { width, height } = texture.image
    aspect.current = width / height

    if (material) {
        drawingTexture.current.setTexture(texture)
        material.needsUpdate = true
    } 
  }, [texture, imagesPaths[0]])

  useEffect(() => {
    material.opacity = sceneObject.opacity
  }, [sceneObject.opacity])

  useEffect(() => {
    if (sceneObject.visibleToCam) ref.current.traverse(child => child.layers.enable(SHOT_LAYERS))
    else ref.current.traverse(child => child.layers.disable(SHOT_LAYERS))
  }, [ref.current, sceneObject.visibleToCam])

  useEffect(() => {
    if (isSelected) {
      props.objectRotationControl.setUpdateCharacter((name, rotation) => {
        let euler = new THREE.Euler().setFromQuaternion(ref.current.worldQuaternion())
        props.updateObject(ref.current.userData.id, {
          rotation: {
            x : euler.x,
            y : euler.y,
            z : euler.z,
          }
        } )})
      props.objectRotationControl.setCharacterId(ref.current.uuid)
      props.objectRotationControl.selectObject(ref.current, ref.current.uuid)
      props.objectRotationControl.IsEnabled = !sceneObject.locked
      props.objectRotationControl.control.setShownAxis(axis.X_axis | axis.Y_axis | axis.Z_axis)

    } else {
      if(props.objectRotationControl && props.objectRotationControl.isSelected(ref.current)) {
        props.objectRotationControl.deselectObject()
      } 
    }
  }, [isSelected]) 

  useEffect(() => {
    if(props.isDrawingMode) {
      props.objectRotationControl.deselectObject();
      gl.domElement.addEventListener( 'mousedown', onKeyDown )
      window.addEventListener( 'mouseup', onKeyUp )
    }
    return () => {
      gl.domElement.removeEventListener( 'mousedown', onKeyDown )
      window.removeEventListener( 'mouseup', onKeyUp )
    }

  }, [props.isDrawingMode, props.drawingMesh])
  
  const { x, y, z, visible, height, rotation, locked } = sceneObject

  useEffect(() => {
    if(!props.objectRotationControl || !isSelected) return
    props.objectRotationControl.IsEnabled = !locked
  }, [locked])

  useEffect(() => {
    drawingTexture.current.setMesh(props.drawingMesh.type)
  }, [props.drawingMesh.type])

  const draw = (event) => {
    drawingTexture.current.draw(mouse(event, gl), ref.current, camera, props.drawingMesh);
  } 
  const onKeyDown = (event) => {
    isDrawingMode.current = true;
    gl.domElement.addEventListener('mousemove', draw)
  }

  const onKeyUp = (event) => {
    gl.domElement.removeEventListener('mousemove', draw)
    isDrawingMode.current = false;
    drawingTexture.current.resetMeshPos();
    saveDataURLtoFile(drawingTexture.current.getImage(), `${sceneObject.id}-texture.png`, props.storyboarderFilePath)
  }

  return (
    <group
      ref={ ref }
      onController={ sceneObject.visible ? () => null : null }
      userData={{
        type: "image",
        id: sceneObject.id,
        locked: locked
      }}
      visible={ visible }
      position={ [x, z, y] }
      scale={ [height * aspect.current, height, 1] }
      rotation={ [rotation.x, rotation.y, rotation.z] }
    >
      <mesh>
        <primitive attach="geometry" object={ createRoundedPlane(0.1, 1)} />
        <primitive attach="material" object={ material } />
      </mesh>
    </group>
  )
})

export default Image
