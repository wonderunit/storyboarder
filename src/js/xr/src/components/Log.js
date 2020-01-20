const { useMemo, useRef, useCallback } = React = require('react')

const { create } = require('zustand')

const [useLogStore, useLogStoreApi] = create(set => ({
  log: []
}))

const reducer = (state, ...rest) => {
  let string = rest.join(', ')
  let next = state.log.slice()
  next.push(string)
  let log = next.slice(-5)

  return { ...state, log }
}

const Log = ({ position }) => {
  const log = useLogStore(state => state.log)
  const label = log.join('\n')

  const canvas = useRef(null)
  const getCanvas = useCallback(() => {
    if (canvas.current == null) {
      canvas.current = document.createElement('canvas')
      canvas.current.width = 512
      canvas.current.height = 150
    }
    return canvas.current
  })

  const texture = useRef(null)
  const getTexture = useCallback(() => {
    if (texture.current == null) {
      texture.current = new THREE.CanvasTexture(getCanvas())
      texture.current.minFilter = THREE.LinearFilter
    }
    return texture.current
  }, [])

  useMemo(() => {
    let context = getCanvas().getContext('2d')

    // clear
    context.canvas.width = context.canvas.width
    context.canvas.height = context.canvas.height

    context.fillStyle = '#000000'
    context.fillRect(0, 0, context.canvas.width, context.canvas.height)

    // draw
    let size = 25
    let lineHeight = 30
    let offset = -6
    context.fillStyle = '#00aa00'
    context.font = `${size}px verdana`
    label.split('\n').forEach((line, n) => {
      context.fillText(line, 0, ((n + 1) * lineHeight) + offset)
    })

    getTexture().needsUpdate = true
  }, [label])

  return (
    <group
      position={position}
      scale={[0.5, 0.5, 0.5]}
      userData={{ type: 'ui' }}>
      <mesh>
        <planeBufferGeometry
          attach="geometry"
          args={[1, 150/512]} />
        <meshBasicMaterial
          attach="material"
          map={getTexture()}
          transparent={true}
          opacity={1} />
      </mesh>
    </group>
  )
}

const log = (...rest) => useLogStoreApi.setState(reducer(useLogStoreApi.getState(), ...rest))

module.exports = {
  log,
  Log
}
