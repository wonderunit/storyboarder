import * as THREE from 'three'
import React, { useMemo } from 'react'
import buildSquareRoom from '../../utils/build-square-room'
import { SHOT_LAYERS } from '../../utils/ShotLayers'
import { useUpdate } from 'react-three-fiber'

const wallsFactory = ({ width, height, length }) => {
  let geometry = new THREE.BoxBufferGeometry(
    width,
    height,
    length
  )
  var edges = new THREE.EdgesGeometry( geometry )
  var line = new THREE.LineSegments(
    edges,
    new THREE.LineBasicMaterial({ color: 0x999999 })
  )
  line.position.set(0, height / 2, 0)
  return line
}

const Room = React.memo(({texture, width, length, height, visible, isTopDown = false }) => {

  const ref = useUpdate(
    self => {
      self.layers.enable(SHOT_LAYERS) 
    }
  )

  const mesh = useMemo(
    () => {
      if(isTopDown) return 
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
          },
        }
      )
      mesh.position.y = -0.03
      return mesh
  }, [texture, width, length, height])

  const walls = useMemo(() => {
    if(!isTopDown) return []
    return wallsFactory({width, length, height})
  }, [ width, length, height])

  return <primitive
    ref={ref}
    name="room"
    userData={{
      type: "room"
    }}
    object={!isTopDown ? mesh : walls}
    visible={visible}
  />
})

export default Room
