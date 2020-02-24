import * as THREE from 'three'
import React, { useMemo, useEffect, useRef } from 'react'
import { useUpdate, extend, useThree } from 'react-three-fiber'

import traverseMeshMaterials from '../../helpers/traverse-mesh-materials'
import {useAsset} from "../../hooks/use-assets-manager"

import { SHOT_LAYERS } from '../../utils/ShotLayers'
import {MeshToonMaterial} from "three"
import ObjectRotationControl from "../../../shared/IK/objects/ObjectRotationControl"
import RoundedBoxGeometryCreator from './../../../vendor/three-rounded-box'
import {patchMaterial, setSelected} from "../../helpers/outlineMaterial"
import KeyCommandsSingleton from '../KeyHandler/KeyCommandsSingleton'
const RoundedBoxGeometry = RoundedBoxGeometryCreator(THREE)

extend({RoundedBoxGeometry})

const materialFactory = (isIcon) => patchMaterial(new MeshToonMaterial({
  color: 0xcccccc,
  emissive: 0x0,
  specular: 0x0,
  reflectivity: 0x0,
  skinning: false,
  shininess: 0,
  flatShading: false,
  morphNormals: false,
  morphTargets: false
}), {
  thickness: 0.008
})

const meshFactory = (source, isIcon) => {
  let mesh = source.clone()

  let material = materialFactory(isIcon)

  if (mesh.material.map) {
    material.map = mesh.material.map
    material.map.needsUpdate = true
  }
  mesh.material = material

  return mesh
}

const ModelObject = React.memo(({path, isIcon = false, sceneObject, isSelected, ...props }) => {
  const ref = useUpdate(
    self => {
      self.traverse(child => child.layers.enable(SHOT_LAYERS))
    }
  )
  const { scene, camera, gl } = useThree()
  const isObjectSelected = useRef(null)
  const objectRotationControl = useRef(null)
  
  const {asset} = useAsset((sceneObject.model === 'box') ? null : path)

  const meshes = useMemo(() => {
    if (sceneObject.model === 'box') {
      return [
        <mesh key={sceneObject.id}>
          <roundedBoxGeometry
            ref={ref => ref && ref.translate(0, 0.5, 0)}
            attach='geometry'
            args={[1, 1, 1, 0.005, 5]} />
          <primitive
            attach='material'
            object={materialFactory(isIcon)} />
        </mesh>
      ]
    }

    if (asset) {
      let children = []
      asset.scene.traverse(child => {
        if (child.isMesh) {
          children.push(
            <primitive
              key={`${sceneObject.id}-${child.uuid}`}
              object={meshFactory(child, isIcon)}
            />
          )
        }
      })
      return children
    }

    return []
  }, [sceneObject.model, asset])


  useEffect(() => {
    objectRotationControl.current = new ObjectRotationControl(scene.children[0], camera, gl.domElement, ref.current.uuid)
    objectRotationControl.current.control.canSwitch = false
    objectRotationControl.current.setUpdateCharacter((name, rotation) => {
      let euler = new THREE.Euler().setFromQuaternion(ref.current.worldQuaternion())
      props.updateObject(ref.current.userData.id, {
        rotation:
        {
          x : euler.x,
          y : euler.y,
          z : euler.z,
        }
      } )})
  }, [])

  const controlPlusRCheck = (event) => {
    event.stopPropagation()
    if(event.ctrlKey && event.key === 'e'){
      event.stopPropagation()
      return true
    } 
  }

  useEffect(() => {
    if(!objectRotationControl.current) return
    objectRotationControl.current.setCamera(camera)
  }, [camera])

  const switchManipulationState = () => {
    let isRotation = !ref.current.userData.isRotationEnabled
    ref.current.userData.isRotationEnabled = isRotation
    if(isRotation) {
      objectRotationControl.current.selectObject(ref.current, sceneObject.id)
      objectRotationControl.current.isEnabled = true
    } else {
      objectRotationControl.current.deselectObject()
      objectRotationControl.current.isEnabled = false
    }
  }

  useEffect(() => {
    traverseMeshMaterials(ref.current, material => {
      if (material.emissive) {
        material.emissive = new THREE.Color( sceneObject.tintColor || '#000000' )
      }
    })
  }, [ref.current, sceneObject.tintColor])

  useEffect(() => {
    ref.current.traverse((child) => {
      if (child.isMesh) {
        setSelected(child, isSelected)
      }
    })
  }, [ref.current, isSelected, asset])

  useEffect(() => {
    if(!ref.current) return
    if(isSelected) {
      KeyCommandsSingleton.getInstance().addKeyCommand({
        key: "Switch objects to rotation", 
        value: switchManipulationState,
        keyCustomCheck: controlPlusRCheck
      })
      if(!isObjectSelected.current) {
        if(objectRotationControl.current.isEnabled) { 
          objectRotationControl.current.selectObject(ref.current, sceneObject.id)
        }
        isObjectSelected.current = true
      }
    }
    else {
      if(isObjectSelected.current) {
        objectRotationControl.current.deselectObject()
        isObjectSelected.current = false
      }
    }
    return function cleanup () {
      KeyCommandsSingleton.getInstance().removeKeyCommand({key: "Switch objects to rotation"})
    }
  }, [isSelected])

  const { x, y, z, visible, width, height, depth, rotation, locked } = sceneObject

  return <group
    ref={ref}

    onController={ sceneObject.visible ? () => null : null} 
    userData={{
      type: 'object',
      id: sceneObject.id,
      locked: locked,
      isRotationEnabled: false,
    }}

    visible={ visible }
    position={ [x, z, y] }
    scale={ [width, height, depth] }
    rotation={ [rotation.x, rotation.y, rotation.z] }
    {...props}
  >
    {meshes}
  </group>
})

export default ModelObject
