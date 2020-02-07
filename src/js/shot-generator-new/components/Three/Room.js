import * as THREE from 'three'
import React, { useMemo, useRef } from 'react'
import buildSquareRoom from '../../utils/build-square-room'
import SHOT_LAYERS from '../../utils/ShotLayers'

const Room = React.memo(({texture, width, length, height, visible }) => {
  const ref = useRef()
  const mesh = useMemo(
    () => {
      if(!texture) return
      texture.wrapS = texture.wrapT = THREE.RepeatWrapping
      texture.offset.set(0, 0)
      texture.repeat.set(4.5, 4.5)

      let mesh = buildSquareRoom(
        width,
        length,
        height,
        {
          textures: {
            wall: texture
          }
        }
      )
      mesh.position.y = -0.03
      mesh.layers.enable(SHOT_LAYERS)
      return mesh
    }, [texture, width, length, height])

  return <primitive
    ref={ref}
    name='room'
    userData={{
      type: 'room'
    }}
    object={mesh}
    visible={visible}
  />
})

export default Room
