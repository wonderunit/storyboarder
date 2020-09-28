import * as THREE from 'three'
import React, { useEffect, useMemo, useRef } from 'react'
import { extend } from 'react-three-fiber'
import { useAsset } from '../../hooks/use-assets-manager'
import { SHOT_LAYERS } from '../../utils/ShotLayers'
import RoundedBoxGeometryCreator from './../../../vendor/three-rounded-box'
import { axis } from '../../../shared/IK/utils/TransformControls'
import DrawingTextureType from '../InspectedWorld/DrawingTextureType'
import { TextureObjectType} from './Helpers/DrawingTextureContainer'
import createRoundedPlane from './Helpers/create-rounded-plane'
import { saveDataURLtoTempFile } from '../../helpers/saveDataURLtoFile'
const RoundedBoxGeometry = RoundedBoxGeometryCreator(THREE)
import fs from 'fs-extra'
import path from 'path'
extend({RoundedBoxGeometry})

const Image = React.memo(({ sceneObject, isSelected, imagesPaths, ...props }) => {
  const {asset: texture, loaded} = useAsset(imagesPaths[0] || null)
  const aspect = useRef(1)
  const ref = useRef()
  const material = useMemo(() => {
    let texture = props.drawTextures.createTexture(sceneObject.id, DrawingTextureType.Simple, TextureObjectType.Image)
    let material = new THREE.MeshToonMaterial({ transparent: true, side: THREE.DoubleSide });
    texture.createMaterial(material)
    return material
  }, [])

  const save = () => {
    saveDataURLtoTempFile( props.drawTextures.getTextureById(sceneObject.id).texture.getImage("image/png"), props.storyboarderFilePath, props.updateObject, ref.current)
  }

  useEffect(() => {
    return () => {
      delete props.drawTextures.removeTexture(sceneObject.id) 
    }
  }, [])

  useMemo(() => {
    if(!texture) return
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping
    texture.offset.set(0, 0)
    texture.repeat.set(1, 1)

    const { width, height } = texture.image
    aspect.current = width / height
    if (material) {
      let textureObject = props.drawTextures.getTextureById(sceneObject.id)
      textureObject.texture.setTexture(texture)
      textureObject.save = () => save()
      material.needsUpdate = true
    } 
  }, [texture])

  useEffect(() => {
    material.opacity = sceneObject.opacity
  }, [sceneObject.opacity])

  useEffect(() => {
    if (sceneObject.visibleToCam) ref.current.traverse(child => child.layers.enable(SHOT_LAYERS))
    else ref.current.traverse(child => child.layers.disable(SHOT_LAYERS))
  }, [ref.current, sceneObject.visibleToCam])

  useEffect(() => {
    return () => {
      if(props.objectRotationControl && props.objectRotationControl.isSelected(ref.current)) {
        props.objectRotationControl.deselectObject()
      }
      if(ref.current.userData.tempImagePath) {
        let tempImageFilePath = path.join(path.dirname(props.storyboarderFilePath), 'models/images/', ref.current.userData.tempImagePath)
        fs.removeSync(tempImageFilePath)
      }
    }
  }, [])

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
  
  const { x, y, z, visible, height, rotation, locked } = sceneObject

  
  useEffect(() => {
    if(!props.objectRotationControl || !isSelected) return
    props.objectRotationControl.IsEnabled = !locked
  }, [locked])

  const userDataInfo = {  
    type: "image",
    id: sceneObject.id,
    locked: locked
  }

  return (
    <group
      ref={ ref }
      onController={ sceneObject.visible ? () => null : null }
      userData={ref.current ? { 
        ...ref.current.userData,
        ...userDataInfo
      } : userDataInfo}
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
