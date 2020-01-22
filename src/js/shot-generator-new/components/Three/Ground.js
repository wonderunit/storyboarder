import * as THREE from 'three'
import React, { useMemo } from 'react'


const groundFactory = ({ texture }) => {
    let material = new THREE.MeshToonMaterial({ map: texture, side: THREE.FrontSide })
    // material.transparent = true
    // material.blending = THREE.MultiplyBlending
    material.opacity = 1

    let geometry = new THREE.PlaneGeometry( 135 / 3, 135 / 3, 32 )
    let object = new THREE.Mesh( geometry, material )
    object.userData.type = 'ground'
    object.rotation.x = -Math.PI / 2
    // shift slightly to allow for OutlineEffect
    object.position.y = -0.03
    // object.renderOrder = 0.7
    return object
  }

const Ground = React.memo(({ objRef, texture, visible }) => {
  useMemo(() => {
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping
    texture.offset.set(0, 0)
    texture.repeat.set(100, 100)
  }, [texture])

  return <mesh
    ref={objRef}
    // slightly offset to allow for outlines
    position={[0, -0.03, 0]}
    rotation={[-Math.PI / 2, 0, 0]}
    userData={{
      type: 'ground'
    }}
   // onUpdate={self => (self.layers.enable(VirtualCamera.VIRTUAL_CAMERA_LAYER))}
  >
    <planeBufferGeometry attach='geometry' args={[135 / 3, 135 / 3, 32]} />
    <meshToonMaterial attach='material' side={THREE.FrontSide} visible={visible}>
      <primitive attach='map' object={texture} />
    </meshToonMaterial>
  </mesh>
})

export default Ground
