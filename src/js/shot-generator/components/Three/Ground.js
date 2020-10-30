import * as THREE from 'three'
import React, { useMemo } from 'react'
import { SHOT_LAYERS } from '../../utils/ShotLayers'

const Ground = React.memo(({ objRef, texture, visible }) => {
  useMemo(() => {
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping
    texture.offset.set(0, 0)
    texture.repeat.set(100, 100)
  }, [texture])

  return <mesh
    ref={ objRef } 
    // slightly offset to allow for outlines
    position={ [0, -0.03, 0] }
    rotation={ [-Math.PI / 2, 0, 0] }
    userData={{
      type: "ground"
    }}
    onUpdate={self => (self.layers.enable(SHOT_LAYERS))}
    visible={ visible }
  >
    <planeBufferGeometry attach="geometry" args={ [135 / 3, 135 / 3, 32] } />
    <meshToonMaterial attach="material" side={ THREE.FrontSide } >
      <primitive attach="map" object={ texture } />
    </meshToonMaterial>
  </mesh>
})

export default Ground
