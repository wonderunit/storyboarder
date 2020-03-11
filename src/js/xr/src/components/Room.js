const THREE = require('three')
const { useMemo, useRef } = React = require('react')

const VirtualCamera = require('../components/VirtualCamera')

const buildSquareRoom = require('../../../shot-generator/utils/build-square-room').default

const Room = React.memo(({ texture, width, length, height, visible }) => {
  const ref = useRef()

  const mesh = useMemo(
    () => {
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
      mesh.layers.enable(VirtualCamera.VIRTUAL_CAMERA_LAYER)
      return mesh
    },
    [texture, width, length, height]
  )

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

module.exports = Room
