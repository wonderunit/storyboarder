import * as THREE from 'three'
import React, { useEffect, useMemo, useRef, useLayoutEffect } from 'react'
import { extend, useThree } from 'react-three-fiber'
import { useAsset } from '../../hooks/use-assets-manager'
import { SHOT_LAYERS } from '../../utils/ShotLayers'
import RoundedBoxGeometryCreator from './../../../vendor/three-rounded-box'
import { axis } from "../../../shared/IK/utils/TransformControls"
import DrawingTexture from "./Helpers/drawing-on-texture" 
import KeyCommandsSingleton from '../KeyHandler/KeyCommandsSingleton'
const RoundedBoxGeometry = RoundedBoxGeometryCreator(THREE)

extend({RoundedBoxGeometry})
const mouse = (event, gl) => {
  const rect = gl.domElement.getBoundingClientRect();
  let worldX = ( ( event.clientX - rect.left ) / rect.width ) * 2 - 1;
  let worldY = - ( ( event.clientY - rect.top ) / rect.height ) * 2 + 1;
  return { x: worldX, y: worldY }
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
      drawingTexture.current.Enabled = true
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

      KeyCommandsSingleton.getInstance().addKeyCommand({
        key: "image-drawing", 
        keyCustomCheck: onKeyDown,
        value: () => {}})
      gl.domElement.addEventListener('mousemove', draw)
      window.addEventListener( 'keyup', onKeyUp, false )

    } else {
      drawingTexture.current.Enabled = false
      if(props.objectRotationControl && props.objectRotationControl.isSelected(ref.current)) {
        props.objectRotationControl.deselectObject()
      } 

      gl.domElement.removeEventListener('mousemove', draw)
      window.removeEventListener( 'keyup', onKeyUp, false )
      KeyCommandsSingleton.getInstance().removeKeyCommand({key: "image-drawing"})
    }
  }, [isSelected]) 
  
  const { x, y, z, visible, height, rotation, locked } = sceneObject

  useEffect(() => {
    if(!props.objectRotationControl || !isSelected) return
    props.objectRotationControl.IsEnabled = !locked
  }, [locked])

  const draw = (event) => {
    if(!isDrawingMode.current) return
    drawingTexture.current.draw(mouse(event, gl), ref.current, camera);
  } 

  const onKeyDown = (event) => {
    if ( event.keyCode === 16 ) {
      isDrawingMode.current = true;
      props.objectRotationControl.deselectObject();
    }
  }

  const onKeyUp = (event) => {
   if ( event.keyCode === 16 ) {
      isDrawingMode.current = false;
      props.objectRotationControl.selectObject(ref.current, ref.current.uuid);
      props.objectRotationControl.IsEnabled = !sceneObject.locked;
      drawingTexture.current.resetMeshPos();
    }
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
        <roundedBoxGeometry attach="geometry" args={ [1, 1, 0.01, 0.01] } />
        <primitive attach="material" object={ material } />
      </mesh>
    </group>
  )
})

export default Image
