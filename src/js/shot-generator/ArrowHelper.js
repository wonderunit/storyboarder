const { useEffect, useMemo, useRef } = React
const THREE = require('three')

const IconSprites = require('./IconSprites')

const ArrowHelper = React.memo(({ scene, title, description, position, rotation }) => {
  const ref = useRef()
  const iconRef = useRef()

  useEffect(() => {
    console.log('new ArrowHelper', { title, description, position, rotation })

    ref.current = new THREE.Group()

    let arrowHelper = new THREE.ArrowHelper(
      new THREE.Vector3( 0, 0, 0 ), // direction
      new THREE.Vector3( 0, 0, 0 ), // origin
      1, // length
      0xffff00 // color
    )

    let axesHelper = new THREE.AxesHelper( 1 )

    iconRef.current = new IconSprites( 'object', title, ref.current, description )
    iconRef.current.icon.material.visible = false

    ref.current.add(arrowHelper)
    ref.current.add(axesHelper)
    ref.current.add(iconRef.current)


    // "always show"
    ref.current.layers.disable(0)
    // active camera
    ref.current.layers.enable(1)
    // camera plot
    ref.current.layers.enable(2)
    // image rendering
    ref.current.layers.disable(3)

    scene.add(ref.current)

    return function cleanup () {
      scene.remove(ref.current)
    }
  }, [])

  useMemo(() => {
    console.log('\t', 'ArrowHelper changed position', position)
    if (ref.current) {
      ref.current.position.set(position)
      iconRef.current.position.copy(ref.current.position)
    }
  }, [ref.current, position])

  useMemo(() => {
    console.log('\t', 'ArrowHelper changed rotation', rotation)
    if (ref.current) {
      ref.current.rotation.set(rotation)
      iconRef.current.rotation.copy(ref.current.rotation)
    }
  }, [ref.current, rotation])

  return null
})

module.exports = ArrowHelper
