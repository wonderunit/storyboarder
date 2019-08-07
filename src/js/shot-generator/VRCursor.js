const { useEffect, useMemo, useRef } = React
const THREE = require('three')

const IconSprites = require('./IconSprites')

function VRCursor3D(options) {
  THREE.Group.call( this )
  console.log('new VRCursor3D', options)

  let arrowHelper = new THREE.ArrowHelper(
    new THREE.Vector3( 0, 0, 0 ), // direction
    new THREE.Vector3( 0, 0, 0 ), // origin
    1, // length
    0xffff00 // color
  )

  let axesHelper = new THREE.AxesHelper( 1 )

  // TODO traverse to set layers? try saving an image ...
  this.add(arrowHelper)
  this.add(axesHelper)

  // "always show"
  this.layers.disable(0)
  // active camera
  this.layers.enable(1)
  // camera plot
  this.layers.enable(2)
  // image rendering
  this.layers.disable(3)

  this.iconSprite = new IconSprites( 'object', options.label, this )
  this.iconSprite.icon.material.visible = false
  this.add(this.iconSprite)
}
VRCursor3D.prototype = Object.create( THREE.Object3D.prototype )
VRCursor3D.prototype.constructor = VRCursor3D


const VRCursor = React.memo(({ parent, teleport, display }) => {
  const ref = useRef()

  const displayRef = useRef()

  useMemo(() => {
    ref.current = new VRCursor3D(teleport)
    displayRef.current = new VRCursor3D(display)

    ref.current.add(displayRef.current)

    ref.current = ref.current
  }, [])

  useEffect(() => {
    parent.add(ref.current)

    return function cleanup () {
      parent.remove(ref.current)
    }
  }, [])

  // on every render ...
  ref.current.position.set(teleport.position.x, teleport.position.y, teleport.position.z)
  ref.current.rotation.set(teleport.rotation.x, teleport.rotation.y, teleport.rotation.z)

  displayRef.current.position.set(display.position.x, display.position.y, display.position.z)
  displayRef.current.rotation.set(display.rotation.x, display.rotation.y, display.rotation.z)

  return null
})

module.exports = VRCursor
